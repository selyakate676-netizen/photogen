import { NextResponse } from "next/server";
import Replicate from "replicate";
import { getReplicateApiToken } from "@/lib/env";
import {
  getRequestedImageCount,
  isExactInternalGenerationResultSet,
} from "@/lib/ai/generation-count-contract";
import {
  updatePhotoshootGenerationStatus,
  updatePhotoshootStatus,
} from "@/lib/photoshoots/status";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { PhotoshootStatus } from "@/types/database";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: photoshootId } = await params;
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: photoshoot, error: dbError } = await sessionClient
      .from("photoshoots")
      .select("status, training_id, generation_id, result_images, requested_images_count")
      .eq("id", photoshootId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !photoshoot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const serviceClient = createServiceRoleClient();

    if (photoshoot.status === "completed") {
      if (!isExactInternalGenerationResultSet(
        photoshootId,
        photoshoot.result_images || [],
        photoshoot.requested_images_count,
      )) {
        console.error("Completed photoshoot has an invalid generation result count", { photoshootId });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
      return NextResponse.json({ status: "completed", progress: 100, stage: "completed" });
    }

    if (photoshoot.status === "failed") {
      return NextResponse.json({ status: "failed", progress: 0, stage: "failed" });
    }

    if (photoshoot.status === "generating") {
      const savedCount = (photoshoot.result_images || []).length;
      let expectedCount: number;
      try {
        expectedCount = getRequestedImageCount(photoshoot.requested_images_count);
      } catch {
        console.error("Generating photoshoot has an invalid requested image count", {
          photoshootId,
        });
        await updatePhotoshootStatus(serviceClient, photoshootId, "failed");
        return NextResponse.json({ status: "failed", progress: 0, stage: "failed" });
      }

      if (savedCount === expectedCount && isExactInternalGenerationResultSet(
        photoshootId,
        photoshoot.result_images || [],
        expectedCount,
      )) {
        const updated = await updatePhotoshootGenerationStatus(
          serviceClient,
          photoshootId,
          "completed",
          photoshoot.result_images || [],
        );
        return NextResponse.json({
          status: updated ? "completed" : photoshoot.status,
          progress: updated ? 100 : 98,
          stage: updated ? "completed" : "generating",
          savedCount,
          expectedCount,
        });
      }

      if (savedCount > expectedCount) {
        await updatePhotoshootStatus(serviceClient, photoshootId, "failed");
        return NextResponse.json({ status: "failed", progress: 0, stage: "failed" });
      }

      const progress = Math.min(98, 86 + Math.floor((Math.min(savedCount, expectedCount) / expectedCount) * 12));
      return NextResponse.json({
        status: "generating",
        progress,
        stage: "generating",
        savedCount,
        expectedCount,
      });
    }

    if (!photoshoot.training_id) {
      return NextResponse.json({
        status: photoshoot.status,
        progress: photoshoot.status === "pending" ? 3 : 0,
        stage: photoshoot.status,
      });
    }

    const replicate = new Replicate({ auth: getReplicateApiToken() });
    const training = await replicate.trainings.get(photoshoot.training_id);

    let currentStatus: PhotoshootStatus = photoshoot.status;
    let progress = 5;

    if (training.status === "starting") {
      progress = 10;
    } else if (training.status === "processing") {
      currentStatus = "generating";
      const startTime = training.started_at ? new Date(training.started_at).getTime() : Date.now();
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      const calculatedProgress = 12 + Math.floor((elapsedMinutes / 15) * 72);
      progress = Math.min(84, Math.max(12, calculatedProgress));
    } else if (training.status === "succeeded") {
      currentStatus = "generating";
      progress = 85;
    } else if (training.status === "failed" || training.status === "canceled") {
      currentStatus = "failed";
      progress = 0;
    }

    if (currentStatus !== photoshoot.status) {
      const updated = await updatePhotoshootStatus(serviceClient, photoshootId, currentStatus);
      if (!updated) {
        currentStatus = photoshoot.status;
      }
    }

    return NextResponse.json({
      status: currentStatus,
      progress,
      stage: currentStatus,
      replicateStatus: training.status,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
