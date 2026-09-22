import { startMvpGenerationForPhotoshoot } from "@/lib/ai/mvp-generation-adapter";
import {
  SAFE_GENERATION_ERROR,
  updatePhotoshootStatus,
} from "@/lib/photoshoots/status";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function startQueuedPhotoshootGeneration(photoshootId: string, userId?: string) {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || (userId && user.id !== userId)) {
    throw new Error("Authentication required.");
  }

  const { data: ownedPhotoshoot, error: ownerError } = await sessionClient
    .from("photoshoots")
    .select("id")
    .eq("id", photoshootId)
    .eq("user_id", user.id)
    .single();

  if (ownerError || !ownedPhotoshoot) {
    throw new Error("Photoshoot not found.");
  }

  try {
    return await startMvpGenerationForPhotoshoot(photoshootId, {
      waitForCompletion: false,
      userId: user.id,
    });
  } catch (error) {
    console.error("[photoshoot-generation] Provider start failed:", error);
    const serviceClient = createServiceRoleClient();
    await updatePhotoshootStatus(
      serviceClient,
      photoshootId,
      "failed",
      SAFE_GENERATION_ERROR.message,
    );
    throw new Error(SAFE_GENERATION_ERROR.code);
  }
}
