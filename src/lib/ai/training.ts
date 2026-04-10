import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/s3";
import { createClient } from "@/utils/supabase/server";
import AdmZip from "adm-zip";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function startTrainingForPhotoshoot(photoshootId: string) {
  const supabase = await createClient();

  // 1. Получаем инфо о фотосессии
  const { data: photoshoot, error: fetchError } = await supabase
    .from('photoshoots')
    .select('*')
    .eq('id', photoshootId)
    .single();

  if (fetchError || !photoshoot) {
    throw new Error("Заказ не найден");
  }

  if (!photoshoot.images || photoshoot.images.length === 0) {
    throw new Error("Нет изображений для обучения");
  }

  console.log(`[Internal] Starting packaging for ${photoshoot.images.length} images...`);

  // 2. Упаковываем в ZIP
  const zip = new AdmZip();
  
  for (let i = 0; i < photoshoot.images.length; i++) {
    const imageKey = photoshoot.images[i];
    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: imageKey,
      });
      
      const s3Response = await s3Client.send(getCommand);
      if (s3Response.Body) {
        const buffer = await streamToBuffer(s3Response.Body);
        const ext = imageKey.split('.').pop() || 'jpg';
        zip.addFile(`image_${i + 1}.${ext}`, buffer);
      }
    } catch (err) {
      console.error(`Ошибка при скачивании ${imageKey}:`, err);
    }
  }

  const zipBuffer = zip.toBuffer();
  const zipKey = `photoshoots/${photoshoot.user_id}/${photoshoot.id}-dataset.zip`;

  // 3. Загружаем ZIP обратно в S3
  console.log("[Internal] Uploading zip to S3...");
  const putCommand = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: zipKey,
    Body: zipBuffer,
    ContentType: "application/zip",
  });
  
  await s3Client.send(putCommand);

  // 4. Ссылка для Replicate
  console.log("[Internal] Generating presigned URL...");
  const presignedGetCommand = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: zipKey,
  });
  
  const zipUrl = await getSignedUrl(s3Client, presignedGetCommand, { expiresIn: 7200 });

  // 5. Запуск Replicate (Прямым fetch-запросом для максимальной прозрачности)
  console.log("[Internal] Calling Replicate API (Direct Fetch)...");
  const host = process.env.NEXT_PUBLIC_SITE_URL || "https://photogenlab.ru";
  const webhookUrl = `${host}/api/webhooks/replicate/training?secret=${process.env.WEBHOOK_SECRET}&photoshootId=${photoshoot.id}`;

  const token = process.env.REPLICATE_API_TOKEN;
  console.log(`[Diagnostic] Token status: ${token ? 'PRESENT (starts with ' + token.substring(0, 4) + ')' : 'MISSING'}`);

  try {
    const replicateResponse = await fetch(
      "https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/1d5bbcea62886c55d04cc61be37f480ad99ad5f98cfc840c95df4eb1fb05f257/trainings",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: "selyakate676-netizen/photogen_models",
          input: {
            input_images: zipUrl,
            trigger_word: "tok",
            steps: 1000,
            learning_rate: 0.0004
          },
          webhook: webhookUrl,
          webhook_events_filter: ["completed"]
        })
      }
    );

    const resultData = await replicateResponse.json();

    if (!replicateResponse.ok) {
        console.error(`[CRITICAL] Replicate API Error (${replicateResponse.status}):`, JSON.stringify(resultData));
        throw new Error(resultData.detail || "Replicate API error");
    }
    
    // 6. Сохраняем ID
    console.log(`[Internal] Replicate training started SUCCESS. ID: ${resultData.id}`);
    await supabase
      .from('photoshoots')
      .update({ 
        training_id: resultData.id 
      })
      .eq('id', photoshoot.id);
  
    return { success: true, trainingId: resultData.id };

  } catch (err: any) {
    console.error(`[CRITICAL] Fatal error in training trigger:`, err.message);
    throw err;
  }
}
