import { NextResponse } from "next/server";
import { startTrainingForPhotoshoot } from "@/lib/ai/training";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { photoshootId } = await request.json();
    if (!photoshootId) {
      return NextResponse.json({ error: "Необходим photoshootId" }, { status: 400 });
    }

    const result = await startTrainingForPhotoshoot(photoshootId);
    
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error("AI Generation Trigger Error:", error);
    const message = error instanceof Error ? error.message : "Failed to start generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
