import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PhotoshootStatus } from "@/types/database";

type PhotoshootSupabaseClient = SupabaseClient<Database>;

export const PHOTOSHOOT_STATUSES = [
  "pending",
  "training",
  "generating",
  "completed",
  "error",
] as const satisfies readonly PhotoshootStatus[];

export const ALLOWED_PHOTOSHOOT_STATUS_TRANSITIONS = {
  pending: ["training", "error"],
  training: ["generating", "error"],
  generating: ["completed", "error"],
  completed: [],
  error: ["training"],
} as const satisfies Record<PhotoshootStatus, readonly PhotoshootStatus[]>;

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

async function canUpdatePhotoshootStatus(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
  nextStatus: PhotoshootStatus,
): Promise<boolean> {
  const { data: photoshoot, error } = await supabase
    .from("photoshoots")
    .select("status")
    .eq("id", photoshootId)
    .single();

  if (error || !photoshoot) {
    console.error(`Could not load photoshoot status before transition to ${nextStatus}:`, error);
    return false;
  }

  if (!canTransitionPhotoshootStatus(photoshoot.status, nextStatus)) {
    console.warn(
      `Blocked invalid photoshoot status transition for ${photoshootId}: ${photoshoot.status} -> ${nextStatus}`,
    );
    return false;
  }

  return true;
}

export async function markPhotoshootTrainingFailed(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
): Promise<boolean> {
  if (!(await canUpdatePhotoshootStatus(supabase, photoshootId, "error"))) {
    return false;
  }

  await supabase.from("photoshoots").update({ status: "error" }).eq("id", photoshootId);
  return true;
}

export async function markPhotoshootGenerating(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
  loraUrl: string,
): Promise<boolean> {
  if (!(await canUpdatePhotoshootStatus(supabase, photoshootId, "generating"))) {
    return false;
  }

  await supabase
    .from("photoshoots")
    .update({
      status: "generating",
      lora_url: loraUrl,
    })
    .eq("id", photoshootId);

  return true;
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
  if (!(await canUpdatePhotoshootStatus(supabase, photoshootId, nextStatus))) {
    return false;
  }

  await supabase
    .from("photoshoots")
    .update({
      status: nextStatus,
      ...(resultImages ? { result_images: resultImages } : {}),
    })
    .eq("id", photoshootId);

  return true;
}

export async function updatePhotoshootStatus(
  supabase: PhotoshootSupabaseClient,
  photoshootId: string,
  nextStatus: PhotoshootStatus,
): Promise<boolean> {
  if (!(await canUpdatePhotoshootStatus(supabase, photoshootId, nextStatus))) {
    return false;
  }

  await supabase.from("photoshoots").update({ status: nextStatus }).eq("id", photoshootId);
  return true;
}
