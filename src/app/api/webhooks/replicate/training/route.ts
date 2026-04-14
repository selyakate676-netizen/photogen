import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Replicate from "replicate";

import fs from 'fs';
import path from 'path';

// Функция для гарантированного получения ключа напрямую из файла (обход глюков кеша VPS)
function getReliableToken(): string | undefined {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('REPLICATE_API_TOKEN=')) {
          const rawToken = line.split('=')[1]?.trim();
          return rawToken ? rawToken.replace(/^["']|["']$/g, '') : undefined;
        }
      }
    }
  } catch (err) {
    console.error('[Diagnostic] Error reading .env.local manually:', err);
  }
  return process.env.REPLICATE_API_TOKEN;
}

export async function POST(request: Request) {
  try {
    const replicate = new Replicate({
      auth: getReliableToken(),
    });
    // 1. Проверяем секретный ключ авторизации вебхука
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
    console.log(`Replicate Training Webhook received for photoshoot: ${photoshootId}. Status: ${payload.status}`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Если тренировка завершилась с ошибкой или была отменена
    if (payload.status === "failed" || payload.status === "canceled") {
      await supabase.from('photoshoots').update({ status: 'error' }).eq('id', photoshootId);
      return NextResponse.json({ message: "Training failed/canceled, status updated to error." });
    }

    // Если тренировка успешно завершена
    if (payload.status === "succeeded") {
      // url полученных весов LoRA (Обычно в payload.output.weights для ostris trainer)
      const loraUrl = payload.output && (payload.output.weights || payload.output);
      
      if (!loraUrl) {
         console.error("Webhook payload has no output/lora. Payload:", payload);
         await supabase.from('photoshoots').update({ status: 'error' }).eq('id', photoshootId);
         return NextResponse.json({ error: "No Lora Url found inside payload." }, { status: 400 });
      }

      // 1. Обновляем статус и сохраняем ссылку на LoRA
      await supabase
        .from('photoshoots')
        .update({ 
          status: 'generating',
          lora_url: typeof loraUrl === 'string' ? loraUrl : JSON.stringify(loraUrl)
        })
        .eq('id', photoshootId);

      // --- ЗАПУСК ГЕНЕРАЦИИ (FLUX) ---
      
      // Здесь мы достаем заказанный стиль (из базы)
      const { data: photoshoot } = await supabase.from('photoshoots').select('style_id').eq('id', photoshootId).single();
      const styleId = photoshoot?.style_id || "business";
      
      // Словарь промптов (Синхронизировано со StylesGrid.tsx)
      const prompts: Record<string, string> = {
        "career": "Medium shot from the waist up of a beautiful tok woman wearing a tailored business suit, modern office background. Perfectly natural and realistic body proportions, highly detailed face texture, sharp focus, 85mm portrait, cinematic lighting, 8k resolution, raw photo.",
        "dating": "Medium shot from the chest up of a beautiful tok woman for a dating profile, natural sunny outdoor lighting. Flawless realistic anatomy and proportions, charismatic look, 35mm lens, sharp details, soft bokeh.",
        "social": "Medium full body shot of a beautiful tok woman in a modern urban cafe setting. Correct body proportions, natural anatomy, high-end casual clothing, sharp cinematic lighting, depth of field, 8k raw photo.",
        "studio": "Medium shot of a beautiful tok woman in a professional studio setting. Symmetrical and realistic body proportions, clean grey background, sharp focus, dramatic professional lighting, minimalist aesthetic, fashion magazine cover.",
        "neon": "Medium shot of a beautiful tok woman with vibrant neon lighting, cyberpunk style. Perfect natural anatomy, glowing accents, cinematic atmosphere, 8k resolution, highly detailed skin and eyes.",
        "bw": "Medium shot black and white fine art portrait of a beautiful tok woman. Elegant realistic body proportions, dramatic shadows, deep contrast, high-grain film look, professional photography, highly detailed."
      };
      
      // Формирование промпта
      const basePrompt = prompts[styleId.toLowerCase()] || prompts["social"];

      const host = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || request.headers.get("host");
      const genWebhookUrl = `${host}/api/webhooks/replicate/generation?secret=${process.env.WEBHOOK_SECRET}&photoshootId=${photoshootId}`;

      // 2. Вызываем генерацию напрямую на ВАШЕЙ обученной модели!
      // ostris-trainer обучает модель и складывает ее в destination, который мы указали в training.ts
      // Это 'selyakate676-netizen/photogen_models'. Мы можем обращаться к ней напрямую без hf_lora!
      
      let targetModelId = "selyakate676-netizen/photogen_models";
      let versionId = null;
      
      try {
          // Запрашиваем вашу модель, чтобы получить ее последнюю версию (только что обученную).
          const modelInfo = await replicate.models.get("selyakate676-netizen", "photogen_models");
          if (modelInfo && modelInfo.latest_version && modelInfo.latest_version.id) {
              versionId = modelInfo.latest_version.id;
          }
      } catch (err) {
          console.error("Не удалось получить версию модели, пробуем без нее:", err);
      }

      const inputParams = {
           prompt: basePrompt,
           num_outputs: 4,
           aspect_ratio: "3:4",
           output_format: "jpg",
           guidance: 3.0, // немного снизим, чтобы Flux давал больше мягкости
           lora_scale: 0.85, // снижаем силу ЛоРы, чтобы она не ломала пропорции (убирает эффект "большой головы")
           output_quality: 100
      };

      console.log(`Final prediction run directly on your model version: ${versionId || targetModelId} for photoshoot:`, photoshootId);
      
      // Формируем payload для Replicate API
      const predictionPayload: any = {
        input: inputParams,
        webhook: genWebhookUrl,
        webhook_events_filter: ["completed"]
      };

      if (versionId) {
          predictionPayload.version = versionId;
      } else {
          predictionPayload.model = targetModelId;
      }

      // @ts-ignore
      const prediction = await replicate.predictions.create(predictionPayload);

      // Сохраняем generation_id
      await supabase
        .from('photoshoots')
        .update({ generation_id: prediction.id })
        .eq('id', photoshootId);

      return NextResponse.json({ message: "Training successful, generation started." });
    }

    return NextResponse.json({ message: "Status received but no action required." });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
