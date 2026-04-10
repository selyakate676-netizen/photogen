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
      
      // Словарь промптов (Синхронизировано со StylesGrid.tsx)
      const prompts: Record<string, string> = {
        "career": "A professional high-end cinematic business portrait of a person TOK wearing a tailored business suit, modern office background, soft studio lighting, ultra-realistic photography, 8k, detailed skin texture.",
        "dating": "A stunning, attractive lifestyle portrait of a person TOK for a dating profile, natural sunny outdoor lighting, charismatic look, 35mm photography, soft bokeh, high quality.",
        "social": "A trendy lifestyle shot of a person TOK in a modern urban cafe setting, cinematic lighting, high-end casual clothing, photorealistic, depth of field, 8k.",
        "studio": "A minimal professional studio portrait of a person TOK, clean grey background, dramatic professional lighting, minimalist aesthetic, sharp focus, fashion photography.",
        "neon": "A creative artistic portrait of a person TOK with vibrant neon lighting, cyberpunk style, glowing accents, cinematic atmosphere, 8k resolution, highly detailed.",
        "bw": "A classic timeless black and white fine art portrait of a person TOK, dramatic shadows, deep contrast, elegant aesthetic, high-grain film look, professional photography."
      };
      
      // Формирование промпта
      const basePrompt = prompts[styleId.toLowerCase()] || prompts["social"];

      const host = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || request.headers.get("host");
      const genWebhookUrl = `${host}/api/webhooks/replicate/generation?secret=${process.env.WEBHOOK_SECRET}&photoshootId=${photoshootId}`;

      // 2. Вызываем генерацию (Используем официальный flux-dev)
      console.log("Triggering generation for photoshoot:", photoshootId);
      
      const prediction = await replicate.predictions.create({
        model: "black-forest-labs/flux-dev",
        input: {
           prompt: basePrompt,
           extra_lora_url: typeof loraUrl === 'string' ? loraUrl : "", 
           num_outputs: 4,
           aspect_ratio: "3:4",
           output_format: "jpg",
           guidance: 3.5,
           output_quality: 90
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
