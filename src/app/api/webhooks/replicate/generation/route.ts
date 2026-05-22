import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COMPLETED_IMAGES_THRESHOLD = 3;

interface ReplicateGenerationPayload {
  id?: string;
  status?: string;
  output?: unknown;
}

function getOutputImages(output: unknown): string[] {
  if (!Array.isArray(output)) {
    return [];
  }

  return output.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function getStableKeyPart(value: string): string {
  return Buffer.from(value).toString("base64url").slice(0, 32);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

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
    const payload = (await request.json()) as ReplicateGenerationPayload;
    console.log(`Replicate Generation Webhook received for photoshoot: ${photoshootId}. Status: ${payload.status}`);

    // Важно: ИСПОЛЬЗУЕМ SERVICE ROLE KEY для обхода RLS
    // Иначе анонимный вебхук не сможет обновить вашу базу данных!
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Если генерация завершилась с ошибкой
    if (payload.status === "failed" || payload.status === "canceled") {
      const { data: currentShoot } = await supabase
        .from('photoshoots')
        .select('result_images')
        .eq('id', photoshootId)
        .single();

      const existingCount = (currentShoot?.result_images || []).length;
      const nextStatus =
        existingCount >= COMPLETED_IMAGES_THRESHOLD
          ? 'completed'
          : existingCount > 0
            ? 'generating'
            : 'error';

      await supabase.from('photoshoots').update({ status: nextStatus }).eq('id', photoshootId);
      return NextResponse.json({ message: `Generation failed/canceled. Status updated to ${nextStatus}.` });
    }

    // 3. Успешная генерация
    if (payload.status === "succeeded") {
      const images = getOutputImages(payload.output);

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
           const stableSource = payload.id || imageUrl;
           const s3Key = `photoshoots/generations/${photoshootId}/result_${getStableKeyPart(stableSource)}_${i}.jpg`;
           
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
      const newImages = uniqueStrings([...existingImages, ...savedS3Keys]);
      
      // Считаем завершённым если собралось >= 3 картинки (1 может упасть из-за ошибки Replicate)
      const isCompleted = newImages.length >= COMPLETED_IMAGES_THRESHOLD;

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

  } catch (error: unknown) {
    console.error("Generation Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
