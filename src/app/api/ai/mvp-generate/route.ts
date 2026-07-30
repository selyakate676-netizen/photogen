import { NextResponse } from "next/server";

import { startQueuedPhotoshootGeneration } from "@/lib/photoshoots/orchestration";
import { SAFE_GENERATION_ERROR } from "@/lib/photoshoots/status";

interface MvpGenerateRequest {
  photoshootId?: string;
  scenePrompt?: string;
  referenceCount?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MvpGenerateRequest;

    if (!body.photoshootId) {
      return NextResponse.json({ error: "Missing photoshootId" }, { status: 400 });
    }

    const result = await startQueuedPhotoshootGeneration(body.photoshootId);

    return NextResponse.json({
      ok: true,
      predictionId: result.predictionId,
      resultImages: result.resultImages,
    });
  } catch (error) {
    console.error("[mvp-generate]", error);
    return NextResponse.json(
      { error: SAFE_GENERATION_ERROR },
      { status: 409 },
    );
  }
}
