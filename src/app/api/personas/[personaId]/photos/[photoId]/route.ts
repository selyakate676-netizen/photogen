import { NextResponse } from "next/server";
import { processEntityDeletionTask } from "@/lib/deletion-tasks";
import {
  authenticatedDb,
  jsonError,
  personaJson,
  PERSONA_SELECT,
  UUID_RE,
} from "@/lib/personas/api";

type PersonaPhotoRouteContext = { params: Promise<{ personaId: string; photoId: string }> };

export async function DELETE(_request: Request, { params }: PersonaPhotoRouteContext) {
  const { personaId, photoId } = await params;
  if (!UUID_RE.test(personaId) || !UUID_RE.test(photoId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const rpcArgs = { p_persona_id: personaId, p_photo_id: photoId };
  const { error: prepareError } = await db.rpc("prepare_persona_photo_deletion", rpcArgs);
  if (prepareError) return jsonError(prepareError, "Could not prepare photo deletion");
  try {
    await processEntityDeletionTask(db, user.id, "persona_photo", photoId);
  } catch (cleanupError) {
    console.error("Persona photo deletion task failed", cleanupError);
    return NextResponse.json({ error: "Could not delete photo from storage" }, { status: 502 });
  }

  const { data: persona, error: personaError } = await db
    .from("personas")
    .select(PERSONA_SELECT)
    .eq("id", personaId)
    .single();
  if (personaError || !persona) return jsonError(personaError, "Could not load updated persona");

  return NextResponse.json({
    deleted: true,
    persona: personaJson(persona),
    storageCleaned: true,
  });
}
