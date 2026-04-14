import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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

    const supabase = await createClient();

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
        "career": "A professional high-end cinematic business portrait of a beautiful tok woman wearing a tailored business suit, modern office background, soft studio lighting, ultra-realistic photography, 8k, detailed skin texture.",
        "dating": "A stunning, attractive lifestyle portrait of a beautiful tok woman for a dating profile, natural sunny outdoor lighting, charismatic look, 35mm photography, soft bokeh, high quality.",
        "social": "A trendy lifestyle shot of a beautiful tok woman in a modern urban cafe setting, cinematic lighting, high-end casual clothing, photorealistic, depth of field, 8k.",
        "studio": "A minimal professional studio portrait of a beautiful tok woman, clean grey background, dramatic professional lighting, minimalist aesthetic, sharp focus, fashion photography.",
        "neon": "A creative artistic portrait of a beautiful tok woman with vibrant neon lighting, cyberpunk style, glowing accents, cinematic atmosphere, 8k resolution, highly detailed.",
        "bw": "A classic timeless black and white fine art portrait of a beautiful tok woman, dramatic shadows, deep contrast, elegant aesthetic, high-grain film look, professional photography."
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
           guidance: 3.5, // оригинальный параметр FLUX
           output_quality: 90
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
