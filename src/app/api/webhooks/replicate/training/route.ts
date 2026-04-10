import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
  try {
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
      
      // Словарь промптов (Пока заглушки, потом вынесем в отдельный конфиг)
      const prompts: Record<string, string> = {
        "бизнес": "A professional cinematic portrait of a person TOK in a sleek modern office, wearing a high-end tailored business suit, soft window lighting, 8k, hyperrealistic, photography, highly detailed face.",
        "фэшн": "A high-fashion magazine cover shot of a person TOK posing on a vibrant studio background, wearing avant-garde clothing, dramatic lighting, fashion photography, ultra realistic.",
        "креатив": "An artistic neon-lit portrait of a person TOK with vibrant colored lighting cyberpunk style, bokeh, highly textured, dramatic shadow, 8k.",
        "casual": "A candid lifestyle shot of a person TOK sitting in a cozy sunny cafe drinking coffee, 35mm lens, natural lighting, photorealistic."
      };
      
      // Формирование промпта
      const basePrompt = prompts[styleId.toLowerCase()] || prompts["casual"];

      const host = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || request.headers.get("host");
      const genWebhookUrl = `${host}/api/webhooks/replicate/generation?secret=${process.env.WEBHOOK_SECRET}&photoshootId=${photoshootId}`;

      // 2. Вызываем генерацию (Допустим, используем flux-dev и передаем нашу свежую лору (lora_weights))
      console.log("Triggering generation for photoshoot:", photoshootId);
      
      // FLUX Dev поддерживает аргумент hf_loras (если лора сохранена на HF) или параметры lora (в других моделях). 
      // В качестве примера используем ostris/flux-dev-lora. Если lora_url это прямая ссылка .safetensors (output тренировки)
      // мы можем запустить lucataco/flux-dev-lora.
      const prediction = await replicate.predictions.create({
        model: "lucataco/flux-dev-lora", // Модель для генерации с подставным safetensors
        version: "1d5bbcea62886c55d04cc61be37f480ad99ad5f98cfc840c95df4eb1fb05f257",
        input: {
           prompt: basePrompt,
           lora_weights: typeof loraUrl === 'string' ? loraUrl : "", // Путь к safetensors, полученный выше
           num_outputs: 4, // Генерируем 4 фото для старта
           output_format: "jpg"
        },
        webhook: genWebhookUrl,
        webhook_events_filter: ["completed"]
      });

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
