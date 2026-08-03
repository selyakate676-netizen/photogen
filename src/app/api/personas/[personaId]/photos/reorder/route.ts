import { NextResponse } from "next/server";
import { authenticatedDb, jsonError, photoJson, UUID_RE } from "@/lib/personas/api";

type ReorderBody = {
  photoIds?: unknown;
};

type PersonaRouteContext = { params: Promise<{ personaId: string }> };

export async function PUT(request: Request, { params }: PersonaRouteContext) {
  const { personaId } = await params;
  if (!UUID_RE.test(personaId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const body = await request.json().catch(() => null) as ReorderBody | null;
  if (!body || !Array.isArray(body.photoIds)) {
    return NextResponse.json({ error: "A complete photoIds array is required" }, { status: 400 });
  }

  const photoIds = body.photoIds;
  if (
    photoIds.length > 5
    || photoIds.some((id) => typeof id !== "string" || !UUID_RE.test(id))
    || new Set(photoIds).size !== photoIds.length
  ) {
    return NextResponse.json({ error: "Invalid photo order" }, { status: 400 });
  }

  const { data, error } = await db.rpc("reorder_persona_photos", {
    p_persona_id: personaId,
    p_photo_ids: photoIds,
  });
  if (error) return jsonError(error, "Could not reorder photos");

  return NextResponse.json({ photos: (data ?? []).map(photoJson) });
}
