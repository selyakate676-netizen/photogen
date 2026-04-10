import { NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/s3";
import { createClient } from "@/utils/supabase/server";
import AdmZip from "adm-zip";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const maxDuration = 60; // Максимально допустимое время выполнения на Vercel (в секундах)

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  try {
    const { photoshootId } = await request.json();
    if (!photoshootId) {
      return NextResponse.json({ error: "Необходим photoshootId" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Получаем инфо о фотосессии для извлечения ключей изображений
    const { data: photoshoot, error: fetchError } = await supabase
      .from('photoshoots')
      .select('*')
      .eq('id', photoshootId)
      .single();

    if (fetchError || !photoshoot) {
      console.error("Photoshoot not found:", fetchError);
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    if (!photoshoot.images || photoshoot.images.length === 0) {
      return NextResponse.json({ error: "Нет изображений для обучения" }, { status: 400 });
    }

    console.log(`Starting packaging for ${photoshoot.images.length} images...`);

    // 2. Скачиваем изображения из S3 и упаковываем в ZIP
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
          // Сохраняем файл в архив (имя генерируем простое: 1.jpg, 2.jpg и т.д.)
          const ext = imageKey.split('.').pop() || 'jpg';
          zip.addFile(`image_${i + 1}.${ext}`, buffer);
        }
      } catch (err) {
        console.error(`Ошибка при скачивании ${imageKey}:`, err);
      }
    }

    const zipBuffer = zip.toBuffer();
    const zipKey = `photoshoots/${photoshoot.user_id}/${photoshoot.id}-dataset.zip`;

    // 3. Загружаем ZIP-архив обратно в S3
    console.log("Uploading zip to S3...");
    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: zipKey,
      Body: zipBuffer,
      ContentType: "application/zip",
    });
    
    await s3Client.send(putCommand);

    // 4. Генерируем временно подписанную ссылку (для Replicate)
    console.log("Generating presigned URL for Replicate...");
    const presignedGetCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: zipKey,
    });
    
    // Ссылка будет жить 2 часа
    const zipUrl = await getSignedUrl(s3Client, presignedGetCommand, { expiresIn: 7200 });

    // 5. Вызываем Replicate (Запускаем LoRA Training)
    console.log("Calling Replicate...");
    
    // В URL должен быть публичный адрес проекта, берем его из окружения (или localhost для тестов)
    const host = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || request.headers.get("host");
    const webhookUrl = `${host}/api/webhooks/replicate/training?secret=${process.env.WEBHOOK_SECRET}&photoshootId=${photoshoot.id}`;

    const training = await replicate.trainings.create(
      "ostris",
      "flux-dev-lora-trainer",
      "1d5bbcea62886c55d04cc61be37f480ad99ad5f98cfc840c95df4eb1fb05f257",
      {
        destination: "selyakate676-netizen/photogen_models", // Куда положить готовую модель на Replicate
        input: {
          input_images: zipUrl, // Передаем ссылку на ZIP
          trigger_word: "tok",   // Стандартное слово для активации лица
          steps: 1000,
          learning_rate: 0.0004
        },
        webhook: webhookUrl,
        webhook_events_filter: ["completed"] // Нас интересует только успешное/неуспешное завершение
      }
    );

    // 6. Обновляем статус в БД и сохраняем ID тренировки
    console.log(`Replicate training started. ID: ${training.id}`);
    await supabase
      .from('photoshoots')
      .update({ 
        training_id: training.id 
      })
      .eq('id', photoshoot.id);

    return NextResponse.json({ success: true, trainingId: training.id });

  } catch (error: any) {
    console.error("AI Training Trigger Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start training" }, { status: 500 });
  }
}
