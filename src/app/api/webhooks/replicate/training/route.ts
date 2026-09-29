import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOptionalEnv, getReplicateApiToken, getReplicateWebhookSigningSecret, getSupabaseServiceRoleConfig } from "@/lib/env";
import {
  extractLegacyLoraUrlFromTrainingPayload,
  getLegacyLoraPromptsForPhotoshoot,
  startLegacyLoraPredictions,
} from "@/lib/ai/pipeline/legacy-lora";
import {
  markPhotoshootGenerating,
  markPhotoshootTrainingFailed,
  savePhotoshootGenerationIds,
} from "@/lib/photoshoots/status";
import { logReplicateWebhook, verifyReplicateWebhook } from "@/lib/replicate/webhook-security";
import type { Database } from "@/types/database";
import Replicate from "replicate";

// Функция для гарантированного получения ключа напрямую из файла (обход глюков кеша VPS)
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const photoshootId = searchParams.get("photoshootId");
    const rawBody = await request.text();

    if (!verifyReplicateWebhook(request.headers, rawBody, getReplicateWebhookSigningSecret())) {
      logReplicateWebhook("warn", "WEBHOOK_SIGNATURE_INVALID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!photoshootId) {
      return NextResponse.json({ error: "Missing photoshootId" }, { status: 400 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      logReplicateWebhook("warn", "WEBHOOK_BODY_INVALID");
      return NextResponse.json({ error: "Invalid webhook body" }, { status: 400 });
    }

    const replicate = new Replicate({
      auth: getReplicateApiToken(),
    });

    const supabaseConfig = getSupabaseServiceRoleConfig();
    const supabase = createClient<Database>(supabaseConfig.url, supabaseConfig.serviceRoleKey);

    // Если тренировка завершилась с ошибкой или была отменена
    if (payload.status === "failed" || payload.status === "canceled") {
      const updated = await markPhotoshootTrainingFailed(supabase, photoshootId);
      if (!updated) {
        return NextResponse.json({ message: "Training failed/canceled, but status transition was ignored." });
      }

      return NextResponse.json({ message: "Training failed/canceled, status updated to error." });
    }

    // Если тренировка успешно завершена
    if (payload.status === "succeeded") {
      const loraUrl = extractLegacyLoraUrlFromTrainingPayload(payload);
      
      if (!loraUrl) {
         logReplicateWebhook("error", "TRAINING_OUTPUT_INVALID", payload.status);
         await markPhotoshootTrainingFailed(supabase, photoshootId);
         return NextResponse.json({ error: "No Lora Url found inside payload." }, { status: 400 });
      }

      // 1. Обновляем статус и сохраняем ссылку на LoRA
      const updated = await markPhotoshootGenerating(supabase, photoshootId, loraUrl);
      if (!updated) {
        return NextResponse.json({ message: "Training succeeded, but generation start was ignored by status rules." });
      }

      // --- ЗАПУСК ГЕНЕРАЦИИ (FLUX) ---
      
      // Здесь мы достаем заказанный стиль и особенности внешности (из базы)
      const { data: photoshoot } = await supabase
          .from('photoshoots')
          .select('style_id, body_type, eye_color, hair_color, gender')
          .eq('id', photoshootId)
          .single();
          
      const promptsToRun = getLegacyLoraPromptsForPhotoshoot(photoshoot);

      const host = getOptionalEnv("NEXT_PUBLIC_SITE_URL") || request.headers.get("origin") || request.headers.get("host");
      const genWebhookUrl = `${host}/api/webhooks/replicate/generation?photoshootId=${photoshootId}`;

      const predictionIds = await startLegacyLoraPredictions({
        replicate,
        prompts: promptsToRun,
        webhookUrl: genWebhookUrl,
      });

      // Сохраняем все 4 ID через запятую (хоть это и не строго обязательно для логики)
      await savePhotoshootGenerationIds(supabase, photoshootId, predictionIds);

      return NextResponse.json({ message: "Training successful, generation started." });
    }

    return NextResponse.json({ message: "Status received but no action required." });

  } catch {
    logReplicateWebhook("error", "WEBHOOK_PROCESSING_FAILED");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
