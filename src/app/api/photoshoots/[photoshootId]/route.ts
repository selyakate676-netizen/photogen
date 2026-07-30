import { NextResponse } from "next/server";
import { authenticatedDb, UUID_RE } from "@/lib/personas/api";
import { PHOTOSHOOT_HISTORY_SELECT, photoshootHistoryJson } from "@/lib/photoshoots/api";
import type { Photoshoot } from "@/types/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoshootId: string }> },
) {
  const { photoshootId } = await params;
  if (!UUID_RE.test(photoshootId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { data, error } = await db
    .from("photoshoots")
    .select(PHOTOSHOOT_HISTORY_SELECT)
    .eq("id", photoshootId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    { photoshoot: await photoshootHistoryJson(data as Photoshoot) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
