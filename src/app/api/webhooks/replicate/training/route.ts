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
      
      // Здесь мы достаем заказанный стиль и особенности внешности (из базы)
      const { data: photoshoot } = await supabase
          .from('photoshoots')
          .select('style_id, body_type, eye_color, hair_color')
          .eq('id', photoshootId)
          .single();
          
      const styleId = photoshoot?.style_id || "business";
      
      const bodyDesc = photoshoot?.body_type === 'slim' ? 'slim and thin' :
                       photoshoot?.body_type === 'athletic' ? 'toned and athletic' :
                       photoshoot?.body_type === 'curvy' ? 'curvy and voluptuous feminine' : 'average';
                       
      const eyeDesc = photoshoot?.eye_color === 'blue' ? 'blue' :
                      photoshoot?.eye_color === 'green' ? 'green' :
                      photoshoot?.eye_color === 'grey' ? 'grey' : 'brown';
                      
      const hairDesc = photoshoot?.hair_color === 'blonde' ? 'blonde' :
                       photoshoot?.hair_color === 'brown' ? 'brown' :
                       photoshoot?.hair_color === 'red' ? 'red' : 'dark';

      // Для черно-белого стиля убираем цвета из описания, чтобы Flux не пытался рисовать "карие глаза" в ЧБ
      const subjectDescription = styleId.toLowerCase() === 'bw' 
        ? `tok person with ${bodyDesc} body shape`
        : `tok person with ${bodyDesc} body shape, ${eyeDesc} eyes, and ${hairDesc} hair`;
      
      // Словарь базовых промптов (для остальных стилей)
      const basePrompts: Record<string, string> = {
        "career": "Professional editorial portrait of a tok person wearing high-end tailored business attire, modern corporate office background. High-resolution medium shot, Phase One XF IQ4, 85mm f/1.4 lens, beautifully balanced Rembrandt lighting, extremely sharp focus, ultra-realistic skin texture, pores, candid and natural facial proportions, unedited photography, 8k.",
        "dating": "Natural unedited candid photo of a tok person for a dating profile, casual but stylish clothing, bright sunny outdoor environment. 50mm lens f/2.0, soft natural sunlight, shallow depth of field, real skin textures with slight imperfections, effortless charisma, highly photorealistic, taken on Fujifilm XT4.",
        "social": "Medium shot of a tok person sitting at a high-end minimalist cafe. Wearing stylish casual fashionable clothes. Lifestyle photography, taken on Sony A7R iv, 35mm f/1.8, cinematic depth of field, natural soft window lighting, highly detailed unedited face, authentic proportions, hyper-realistic.",
        "neon": "Cinematic portrait of a tok person in a dark cyberpunk city alley. Vibrant neon rim-lighting illuminating the face, deep moody shadows. Shot on Arri Alexa 65, anamorphic lens, beautiful cinematic grain, highly realistic skin reflection, 8k raw.",
        "bw": "Striking fine art pure black and white portrait of a tok person. High-contrast monochromatic photography, strictly greyscale, no colors, Tri-X 400 film stock, dramatic natural light and deep shadows, emphasizing symmetrical beautiful facial structure, flawless skin, highly detailed, realistic."
      };
      
      // Специальный набор из 4 промптов для черно-белой сессии (баланс естественности и бьюти, детальное описание)
      const bwPrompts = [
         // 1. Крупный портрет
         "Ultra realistic professional close-up beauty portrait of a tok person. Long hair below the shoulders with soft natural waves and styling. Authentic natural face proportions, defined jawline, balanced facial features, clear smooth skin, well-groomed appearance. Extremely flattering angle, looking directly into the camera with a calm, confident gaze. Wearing an elegant top. High-contrast monochromatic photography, strictly greyscale, no colors, natural soft daylight, 85mm f/1.4 lens, high detail, DSLR photo, beautifully balanced soft shadows, perfectly preserving natural identity.",
         
         // 2. Как будто прилег, голова на руках боком
         "Ultra realistic professional artistic portrait of a tok person resting their head sideways on their gracefully folded arms on a surface, as if reclining. Long hair below the shoulders with soft natural waves cascading beautifully. Authentic natural face proportions, defined jawline, balanced facial features, clear smooth skin, well-groomed appearance. Serene and relaxed expression, looking softly at the camera. High-contrast B&W studio photography, strictly greyscale, no colors, dramatic moody lighting, deep rich blacks, 50mm lens, high detail, DSLR photo, soft shadows, perfectly preserving natural identity.",
         
         // 3. По пояс, руки скрещены, легкая смеющаяся улыбка
         "Ultra realistic professional waist-up portrait of a tok person standing confidently with arms crossed. Long hair below the shoulders flowing with soft natural waves. Authentic natural face proportions, defined jawline, balanced facial features, clear smooth skin, well-groomed appearance. Showing a natural, pleasant, soft laughing smile. Wearing an elegant white pantsuit. High-contrast B&W photography, strictly greyscale, no colors, soft diffused daylight from a window, 50mm lens, high detail, DSLR photo, soft shadows, joyful atmosphere, perfectly preserving natural identity.",
         
         // 4. 3/4 тела, сидя на стуле
         "Ultra realistic professional 3/4 body shot of a tok person sitting gracefully on a minimalist studio chair. Long hair below the shoulders styled in soft natural waves. Authentic natural face proportions, defined jawline, balanced facial features, clear smooth skin, well-groomed appearance. Relaxed, confident posture, elegant clothing. High-contrast B&W studio photography, strictly greyscale, no colors, soft rim lighting, sharp focus, 50mm lens, high detail, DSLR photo, soft shadows, magazine editorial style, perfectly preserving natural identity."
      ];
      
      // Специальный набор из 4 промптов для студийной сессии (цветные, высокодетализированные)
      const studioPrompts = [
         // 1. Крупный портрет
         "Ultra realistic professional close-up beauty portrait of a tok person. Long hair below the shoulders with soft natural waves and styling. Authentic natural face proportions, defined jawline, balanced facial features, clear smooth skin, healthy skin tone, well-groomed appearance. Extremely flattering angle, looking directly into the camera with a calm, confident gaze. Wearing a sharp tailored black suit over a white silk blouse. Dark grey seamless background. Soft Rembrandt lighting, 85mm f/1.4 lens, high detail, DSLR photo, beautifully balanced soft shadows, perfectly preserving natural identity.",
         
         // 2. Как будто прилег, голова на руках боком
         "Ultra realistic professional artistic color portrait of a tok person resting their head sideways on their gracefully folded arms on a surface, as if reclining. Long hair below the shoulders with soft natural waves cascading beautifully. Authentic natural face proportions, defined jawline, balanced facial features, clear smooth skin, healthy skin tone, well-groomed appearance. Serene and relaxed expression, looking softly at the camera. Studio photography, dark grey seamless background, dramatic moody lighting, rich cinematic colors, 50mm lens, high detail, DSLR photo, soft shadows, perfectly preserving natural identity.",
         
         // 3. По пояс, руки скрещены, легкая смеющаяся улыбка
         "Ultra realistic professional color waist-up portrait of a tok person standing confidently with arms crossed. Long hair below the shoulders flowing with soft natural waves. Authentic natural face proportions, defined jawline, balanced facial features, clear smooth skin, healthy skin tone, well-groomed appearance. Showing a natural, pleasant, soft laughing smile. Wearing an elegant white pantsuit. Studio photography, dark grey background, soft diffused studio light, 50mm lens, high detail, DSLR photo, soft shadows, joyful atmosphere, perfectly preserving natural identity.",
         
         // 4. 3/4 тела, сидя на стуле
         "Ultra realistic professional dynamic color 3/4 body shot of a tok person sitting gracefully on a minimalist studio chair. Long hair below the shoulders styled in soft natural waves. Authentic natural face proportions, defined jawline, balanced facial features, clear smooth skin, healthy skin tone, well-groomed appearance. Relaxed, confident posture, sharp elegant clothing. Studio photography, dark grey seamless background, soft rim lighting, sharp focus, 50mm lens, high detail, DSLR photo, soft shadows, magazine editorial style, perfectly preserving natural identity."
      ];
      
      let promptsToRun: string[] = [];
      if (styleId.toLowerCase() === "studio") {
          promptsToRun = studioPrompts;
      } else if (styleId.toLowerCase() === "bw") {
          promptsToRun = bwPrompts;
      } else {
          const fallback = basePrompts[styleId.toLowerCase()] || basePrompts["social"];
          promptsToRun = [fallback, fallback, fallback, fallback];
      }

      const host = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || request.headers.get("host");
      const genWebhookUrl = `${host}/api/webhooks/replicate/generation?secret=${process.env.WEBHOOK_SECRET}&photoshootId=${photoshootId}`;

      // Запрашиваем модель
      let targetModelId = "selyakate676-netizen/photogen_models";
      let versionId = null;
      
      try {
          const modelInfo = await replicate.models.get("selyakate676-netizen", "photogen_models");
          if (modelInfo && modelInfo.latest_version && modelInfo.latest_version.id) {
              versionId = modelInfo.latest_version.id;
          }
      } catch (err) {
          console.error("Не удалось получить версию модели, пробуем без нее:", err);
      }

      console.log(`Final prediction run directly on your model. Starting 4 jobs...`);
      
      const predictionIds: string[] = [];
      
      // Общий негативный промпт для всех генераций
      const baseNegativePrompt = "acne, pimples, skin blemishes, spots, fat face, chubby cheeks, overweight, double chin, bloated face, distorted face, cartoon, cgi, deformed anatomy, extra fingers, mutated hands, bad proportions";

      // Helper function for delay
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Запускаем 4 последовательных запроса генерации с задержкой, чтобы избежать Rate Limit (429)
      for (let i = 0; i < promptsToRun.length; i++) {
          const p = promptsToRun[i];
          // Интегрируем физические особенности пользователя прямо в промпт
          const personalizedPrompt = p.replace(/tok person/gi, subjectDescription);
          
          const predictionPayload: any = {
            input: {
               prompt: personalizedPrompt,
               negative_prompt: baseNegativePrompt,
               num_outputs: 1, // 1 картинка на 1 промпт
               aspect_ratio: "3:4",
               output_format: "jpg",
               guidance: 3.5,
               output_quality: 100
            },
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
          predictionIds.push(prediction.id);

          // Задержка 10 секунд между запросами, кроме последнего
          if (i < promptsToRun.length - 1) {
              console.log(`Waiting 10s to avoid rate limits before next prediction...`);
              await delay(10000);
          }
      }

      // Сохраняем все 4 ID через запятую (хоть это и не строго обязательно для логики)
      await supabase
        .from('photoshoots')
        .update({ generation_id: predictionIds.join(',') })
        .eq('id', photoshootId);

      return NextResponse.json({ message: "Training successful, generation started." });
    }

    return NextResponse.json({ message: "Status received but no action required." });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
