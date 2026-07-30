import { NextResponse } from "next/server";
import {
  authenticatedDb,
  deletePrivateObjects,
  isPersonaPhotoReferencedBySnapshot,
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
  const { data, error } = await db.rpc("delete_persona_photo", { p_persona_id: personaId, p_photo_id: photoId });
  if (error) return jsonError(error, "Could not delete photo");
  let storageRetained = false;
  let storageCleaned = false;
  try {
    storageRetained = await isPersonaPhotoReferencedBySnapshot(db, data);
    storageCleaned = storageRetained ? false : await deletePrivateObjects([data]);
  } catch (cleanupError) {
    console.error("Persona photo storage retention check failed", cleanupError);
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
    storageCleaned,
    storageRetained,
  });
}
