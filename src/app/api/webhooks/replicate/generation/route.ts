import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    // 1. Проверяем секретный ключ
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const photoshootId = searchParams.get("photoshootId");

    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!photoshootId) {
      return NextResponse.json({ error: "Missing photoshootId" }, { status: 400 });
    }

    // 2. Получаем тело запроса от Replicate
    const payload = await request.json();
    console.log(`Replicate Generation Webhook received for photoshoot: ${photoshootId}. Status: ${payload.status}`);

    const supabase = await createClient();

    // Если генерация завершилась с ошибкой
    if (payload.status === "failed" || payload.status === "canceled") {
      await supabase.from('photoshoots').update({ status: 'error' }).eq('id', photoshootId);
      return NextResponse.json({ message: "Generation failed/canceled." });
    }

    // 3. Успешная генерация
    if (payload.status === "succeeded") {
      const images: string[] = payload.output || [];

      if (images.length === 0) {
        await supabase.from('photoshoots').update({ status: 'error' }).eq('id', photoshootId);
        return NextResponse.json({ error: "No images generated." }, { status: 400 });
      }

      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { s3Client } = await import("@/lib/s3");
      
      const savedS3Keys: string[] = [];

      // Скачиваем каждую картинку из Replicate и сохраняем в наше долговечное S3-хранилище (Beget)
      for (let i = 0; i < images.length; i++) {
        try {
           const imageUrl = images[i];
           const response = await fetch(imageUrl);
           
           if (!response.ok) {
              console.error("Failed to fetch image from Replicate:", imageUrl);
              continue;
           }
           
           const buffer = Buffer.from(await response.arrayBuffer());
           const s3Key = `photoshoots/generations/${photoshootId}/result_${i + 1}.jpg`;
           
           await s3Client.send(new PutObjectCommand({
             Bucket: process.env.S3_BUCKET_NAME,
             Key: s3Key,
             Body: buffer,
             ContentType: "image/jpeg",
           }));
           
           savedS3Keys.push(s3Key);
        } catch (err) {
           console.error("Error saving image to S3:", err);
        }
      }

      // Сохраняем ключи нашего S3
      await supabase
        .from('photoshoots')
        .update({ 
          status: 'completed',
          result_images: savedS3Keys.length > 0 ? savedS3Keys : images // Фолбэк на оригинальные ссылки, если S3 упал
        })
        .eq('id', photoshootId);

      return NextResponse.json({ message: "Generation successful, status updated to completed." });
    }

    return NextResponse.json({ message: "Status received but no action required." });

  } catch (error: any) {
    console.error("Generation Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
