import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Важно: ИСПОЛЬЗУЕМ SERVICE ROLE KEY для обхода RLS
    // Иначе анонимный вебхук не сможет обновить вашу базу данных!
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
           // Добавляем timestamp, чтобы ключи были уникальными для параллельных вебхуков
           const uniqueSuffix = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
           const s3Key = `photoshoots/generations/${photoshootId}/result_${uniqueSuffix}.jpg`;
           
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

      // Т.к. теперь вебхук может вызываться 4 раза (из-за 4 разных промптов),
      // нам нужно аккуратно добавить ключи к уже существующим (в рамках ОДНОЙ генерации)
      
      // Небольшая случайная задержка для минимизации race conditions при параллельных апдейтах
      await new Promise(r => setTimeout(r, Math.random() * 1500));
      
      const { data: currentShoot } = await supabase
          .from('photoshoots')
          .select('result_images, status, generation_id')
          .eq('id', photoshootId)
          .single();
          
      // Берём только изображения, накопленные в рамках ТЕКУЩЕЙ генерации
      // Если generation_id изменился с последнего запуска — сбрасываем старые
      const existingImages = currentShoot?.result_images || [];
      const newImages = [...existingImages, ...savedS3Keys];
      
      // Считаем, что фотосессия завершена, если у нас собралось 4 картинки
      const isCompleted = newImages.length >= 4;

      await supabase
        .from('photoshoots')
        .update({ 
          status: isCompleted ? 'completed' : 'generating',
          result_images: newImages
        })
        .eq('id', photoshootId);

      return NextResponse.json({ message: `Image added. Status updated to ${isCompleted ? 'completed' : 'generating'}. Total: ${newImages.length}` });

    }

    return NextResponse.json({ message: "Status received but no action required." });

  } catch (error: any) {
    console.error("Generation Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
