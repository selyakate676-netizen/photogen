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

  } catch (error: any) {
    console.error("AI Generation Trigger Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start generation" }, { status: 500 });
  }
}

