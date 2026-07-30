import { NextResponse } from "next/server";
import Replicate from "replicate";
import { getReplicateApiToken } from "@/lib/env";
import { updatePhotoshootStatus } from "@/lib/photoshoots/status";
import { createClient } from "@/utils/supabase/server";
import type { PhotoshootStatus } from "@/types/database";

function countGenerationJobs(generationId: string | null): number {
  if (!generationId) return 0;
  return generationId
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean).length;
}

function getGenerationJobIds(generationId: string | null): string[] {
  if (!generationId) return [];
  return generationId
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function getRequiredResultCount(generationId: string | null): number {
  return countGenerationJobs(generationId);
}

function getRecoverableResultCount(generationId: string | null): number {
  const total = countGenerationJobs(generationId);
  if (total <= 1) return total;

  // Hero Composition sets can recover from one provider failure instead of leaving the UI stuck forever.
  return Math.max(1, total - 1);
}

async function getGenerationFailureState(
  generationId: string | null,
): Promise<{ hasFailedJob: boolean; allJobsFinished: boolean }> {
  const generationIds = getGenerationJobIds(generationId);
  if (generationIds.length <= 1) {
    return { hasFailedJob: false, allJobsFinished: false };
  }

  const replicate = new Replicate({ auth: getReplicateApiToken() });
  const results = await Promise.allSettled(
    generationIds.map((id) => replicate.predictions.get(id)),
  );

  const statuses = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value.status] : [],
  );

  const hasFailedJob = statuses.some((status) => status === "failed" || status === "canceled");
  const allJobsFinished =
    statuses.length === generationIds.length &&
    statuses.every((status) => status === "succeeded" || status === "failed" || status === "canceled");

  return { hasFailedJob, allJobsFinished };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: photoshootId } = await params;
    const supabase = await createClient();

    const { data: photoshoot, error: dbError } = await supabase
      .from("photoshoots")
      .select("status, training_id, generation_id, result_images")
      .eq("id", photoshootId)
      .single();

    if (dbError || !photoshoot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (photoshoot.status === "completed") {
      return NextResponse.json({ status: "completed", progress: 100, stage: "completed" });
    }

    if (photoshoot.status === "failed") {
      return NextResponse.json({ status: "failed", progress: 0, stage: "failed" });
    }

    if (photoshoot.status === "generating") {
      const savedCount = (photoshoot.result_images || []).length;
      const expectedCount = getRequiredResultCount(photoshoot.generation_id);
      const recoverableCount = getRecoverableResultCount(photoshoot.generation_id);

      if (expectedCount > 0 && savedCount >= expectedCount) {
        const updated = await updatePhotoshootStatus(supabase, photoshootId, "completed");
        return NextResponse.json({
          status: updated ? "completed" : photoshoot.status,
          progress: updated ? 100 : 98,
          stage: updated ? "completed" : "generating",
          savedCount,
          expectedCount,
        });
      }

      if (recoverableCount > 0 && savedCount >= recoverableCount && recoverableCount < expectedCount) {
        const { hasFailedJob, allJobsFinished } = await getGenerationFailureState(photoshoot.generation_id);

        if (hasFailedJob || allJobsFinished) {
          const updated = await updatePhotoshootStatus(supabase, photoshootId, "completed");
          return NextResponse.json({
            status: updated ? "completed" : photoshoot.status,
            progress: updated ? 100 : 98,
            stage: updated ? "completed" : "generating",
            savedCount,
            expectedCount,
            recoveredFromPartialSet: updated,
          });
        }
      }

      const total = expectedCount || 4;
      const progress = Math.min(98, 86 + Math.floor((Math.min(savedCount, total) / total) * 12));
      return NextResponse.json({
        status: "generating",
        progress,
        stage: "generating",
        savedCount,
        expectedCount: total,
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
      const updated = await updatePhotoshootStatus(supabase, photoshootId, currentStatus);
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
