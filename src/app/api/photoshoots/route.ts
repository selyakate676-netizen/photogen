import { NextResponse } from "next/server";
import { authenticatedDb } from "@/lib/personas/api";
import { PHOTOSHOOT_HISTORY_SELECT, photoshootHistoryJson } from "@/lib/photoshoots/api";
import type { Photoshoot } from "@/types/database";

export async function GET() {
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { data, error } = await db
    .from("photoshoots")
    .select(PHOTOSHOOT_HISTORY_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Photoshoot history list failed:", error);
    return NextResponse.json({ error: "Could not load photoshoots" }, { status: 500 });
  }

  const photoshoots = await Promise.all((data as Photoshoot[]).map(photoshootHistoryJson));
  return NextResponse.json(
    { photoshoots },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
