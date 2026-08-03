import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PhotoshootStatus } from "@/types/database";

type PhotoshootSupabaseClient = SupabaseClient<Database>;

export const PHOTOSHOOT_STATUSES = [
  "pending",
  "awaiting_payment",
  "paid",
  "queued",
  "generating",
  "completed",
  "cancelled",
  "failed",
] as const satisfies readonly PhotoshootStatus[];

export const ALLOWED_PHOTOSHOOT_STATUS_TRANSITIONS = {
  pending: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: ["queued", "cancelled"],
  queued: ["generating", "cancelled"],
  generating: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
} as const satisfies Record<PhotoshootStatus, readonly PhotoshootStatus[]>;

export const SAFE_GENERATION_ERROR = {
  code: "GENERATION_FAILED",
  message: "Не удалось завершить генерацию. Попробуйте позже.",
} as const;

export function canTransitionPhotoshootStatus(
  from: PhotoshootStatus,
  to: PhotoshootStatus,
): boolean {
  if (from === to) {
    return true;
  }

  const allowedTransitions: readonly PhotoshootStatus[] = ALLOWED_PHOTOSHOOT_STATUS_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

export async function markPhotoshootTrainingFailed(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
): Promise<boolean> {
  return updatePhotoshootStatus(supabase, photoshootId, "failed", SAFE_GENERATION_ERROR.message);
}

export async function markPhotoshootGenerating(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
  loraUrl: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("photoshoots")
    .update({ lora_url: loraUrl })
    .eq("id", photoshootId);
  if (error) return false;
  return updatePhotoshootStatus(supabase, photoshootId, "generating");
}

export async function savePhotoshootGenerationIds(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
  predictionIds: string[],
): Promise<void> {
  await supabase
    .from("photoshoots")
    .update({ generation_id: predictionIds.join(",") })
    .eq("id", photoshootId);
}

export async function updatePhotoshootGenerationStatus(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
  nextStatus: PhotoshootStatus,
  resultImages?: string[],
): Promise<boolean> {
  if (resultImages?.length) {
    const { error: resultError } = await supabase.rpc("record_photoshoot_result_images", {
      p_photoshoot_id: photoshootId,
      p_result_images: resultImages,
    });
    if (resultError) {
      console.error("Could not record photoshoot result images:", resultError);
      return false;
    }
  }

  return updatePhotoshootStatus(
    supabase,
    photoshootId,
    nextStatus,
    nextStatus === "failed" ? SAFE_GENERATION_ERROR.message : null,
  );
}

export async function updatePhotoshootStatus(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
  nextStatus: PhotoshootStatus,
  safeError: string | null = null,
): Promise<boolean> {
  if (nextStatus === "completed" || nextStatus === "failed") {
    const { error } = await supabase.rpc("finish_photoshoot_generation", {
      p_photoshoot_id: photoshootId,
      p_succeeded: nextStatus === "completed",
      p_safe_error: safeError,
    });
    if (error) {
      console.warn("Blocked photoshoot finish transition to " + nextStatus + ":", error);
      return false;
    }
    return true;
  }

  const { error } = await supabase.rpc("transition_photoshoot_status", {
    p_photoshoot_id: photoshootId,
    p_next_status: nextStatus,
    p_safe_error: safeError,
  });
  if (error) {
    console.warn("Blocked photoshoot status transition to " + nextStatus + ":", error);
    return false;
  }
  return true;
}

export async function confirmMockPhotoshootPayment(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
): Promise<Database["public"]["Tables"]["photoshoots"]["Row"] | null> {
  const { data, error } = await supabase
    .rpc("confirm_mock_photoshoot_payment", { p_photoshoot_id: photoshootId })
    .single();
  if (error) {
    console.error("Could not confirm mock photoshoot payment:", error);
    return null;
  }
  return data;
}

export async function claimPhotoshootGeneration(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_photoshoot_generation", {
    p_photoshoot_id: photoshootId,
  });
  if (error) {
    console.warn("Could not claim photoshoot generation:", error);
    return false;
  }
  return data === true;
}
