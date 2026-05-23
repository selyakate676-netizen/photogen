import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/s3";
import { createClient } from "@/utils/supabase/server";
import { getReplicateApiToken, getS3BucketName, getSiteUrl, getWebhookSecret } from "@/lib/env";
import Replicate from "replicate";

// Функция получения токена API (как в training.ts)
const replicate = new Replicate({
  auth: getReplicateApiToken(),
});

// Базовые стили для проверки реалистичности с InstantID
const STYLES_PROMPT_MAP: Record<string, string> = {
  career: "a person wearing a professional black business suit, standing in a modern office, cinematic lighting",
  studio: "a person in minimalist casual clothes, studio photography, grey background, soft box lighting",
  social: "a person sitting in a cozy outdoor cafe, wearing stylish urban clothes, natural sunlight",
  dating: "a person smiling, wearing beautiful evening clothes, bokeh background, sunset lighting",
  neon: "a person in cyberpunk style clothing, neon city lights background, moody atmosphere",
  bw: "a person, elegant posture, elegant clothing, fine art black and white photography, dramatic shadows",
  default: "a person, ultra realistic DSLR photo"
};

export async function startGenerationForPhotoshoot(photoshootId: string) {
  const supabase = await createClient();
  const s3BucketName = getS3BucketName();

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
    throw new Error("Нет фотографий для генерации");
  }

  // 2. Берем ПЕРВОЕ фото как Image Reference
  // В будущем будем брать лучшее или давать выбор.
  const referenceImageKey = photoshoot.images[0];
  console.log(`[InstantID] Using reference image: ${referenceImageKey}`);

  // Генерируем временную ссылку на 2 часа
  const presignedGetCommand = new GetObjectCommand({
    Bucket: s3BucketName,
    Key: referenceImageKey,
  });
  const imageUrl = await getSignedUrl(s3Client, presignedGetCommand, { expiresIn: 7200 });

  // 3. Формируем промпт
  const styleDescription = STYLES_PROMPT_MAP[photoshoot.style_id] || STYLES_PROMPT_MAP['default'];
  
  // Добавляем жесткие параметры реалистичности из ТЗ
  const prompt = `ultra realistic DSLR photo, 85mm lens, natural skin texture, pores, cinematic lighting, soft shadows, high dynamic range, RAW photo, ${styleDescription}`;
  const negative_prompt = "cartoon, illustration, cgi, 3d, render, fake skin, smooth skin, blurry, deformed face, bad anatomy";

  // 4. Подготавливаем Webhook для получения результата
  const host = getSiteUrl();
  const webhookUrl = `${host}/api/webhooks/replicate/generation?secret=${getWebhookSecret()}&photoshootId=${photoshoot.id}`;

  console.log("[InstantID] Calling fofr/instant-id...");
  
  try {
    // 5. Вызываем fofr/instant-id
    // ID версии для fofr/instant-id (согласно документации Replicate API для этой модели)
    const result = await replicate.predictions.create({
      version: "6af8583c541261472e92155d87bba80d5ad0153c9f02623d8c0b7beaaadcb9eb", // Последняя стабильная версия fofr/instant-id
      input: {
        image: imageUrl, // фото пользователя
        prompt: prompt,
        negative_prompt: negative_prompt,
        width: 768,
        height: 768,
        num_outputs: 4, // 4 фото как в ТЗ
        guidance_scale: 5,
        num_inference_steps: 30
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log(`[InstantID] Generation started SUCCESS. ID: ${result.id}`);
    
    // 6. Обновляем статус на generating и сохраняем generation_id
    // Пока используем колонку training_id для хранения generation_id, чтобы не ломать Dashboard UI
    await supabase
      .from('photoshoots')
      .update({ 
        status: 'generating', // или 'training', если UI ждет 'training'
        training_id: result.id, // перезаписываем ID
        generation_id: result.id 
      })
      .eq('id', photoshoot.id);
  
    return { success: true, generationId: result.id };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[CRITICAL] Fatal error in generation trigger:`, message);
    throw err;
  }
}
