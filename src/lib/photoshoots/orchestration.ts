import { startMvpGenerationForPhotoshoot } from "@/lib/ai/mvp-generation-adapter";
import {
  SAFE_GENERATION_ERROR,
  confirmMockPhotoshootPayment,
  updatePhotoshootStatus,
} from "@/lib/photoshoots/status";
import { createClient } from "@/utils/supabase/server";

export async function confirmMockPaymentAndQueue(photoshootId: string, userId: string) {
  const supabase = await createClient();
  const photoshoot = await confirmMockPhotoshootPayment(supabase, photoshootId);

  if (!photoshoot || photoshoot.user_id !== userId) {
    return { ok: false as const, code: "PHOTOSHOOT_NOT_FOUND" as const };
  }

  return {
    ok: true as const,
    photoshoot,
    shouldStartGeneration: photoshoot.status === "queued",
  };
}

export async function startQueuedPhotoshootGeneration(photoshootId: string, userId?: string) {
  const supabase = await createClient();

  try {
    return await startMvpGenerationForPhotoshoot(photoshootId, {
      waitForCompletion: false,
      userId,
    });
  } catch (error) {
    console.error("[photoshoot-generation] Provider start failed:", error);
    await updatePhotoshootStatus(
      supabase,
      photoshootId,
      "failed",
      SAFE_GENERATION_ERROR.message,
    );
    throw new Error(SAFE_GENERATION_ERROR.code);
  }
}
