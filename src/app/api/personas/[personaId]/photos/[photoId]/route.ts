import { NextResponse } from "next/server";
import {
  authenticatedDb,
  deletePrivateObject,
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
  const { data: storagePath, error: prepareError } = await db.rpc("prepare_persona_photo_deletion", rpcArgs);
  if (prepareError) return jsonError(prepareError, "Could not prepare photo deletion");
  try {
    await deletePrivateObject(storagePath);
  } catch (storageError) {
    const { error: cancelError } = await db.rpc("cancel_persona_photo_deletion", rpcArgs);
    if (cancelError) console.error("Could not cancel Persona photo deletion reservation", cancelError);
    console.error("Persona photo storage cleanup failed", storageError);
    return NextResponse.json({ error: "Could not delete photo from storage" }, { status: 502 });
  }

  const { error: deleteError } = await db.rpc("delete_persona_photo", rpcArgs);
  if (deleteError) return jsonError(deleteError, "Could not finalize photo deletion");

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
