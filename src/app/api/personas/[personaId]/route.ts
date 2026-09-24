import { NextResponse } from "next/server";
import { authenticatedDb, deletePrivatePrefix, invalidInput, jsonError, parsePersonaBody, personaJson, PERSONA_SELECT, UUID_RE } from "@/lib/personas/api";

type PersonaRouteContext = { params: Promise<{ personaId: string }> };

export async function GET(_request: Request, { params }: PersonaRouteContext) {
  const { personaId } = await params;
  if (!UUID_RE.test(personaId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const { data, error } = await db.from("personas").select(PERSONA_SELECT).eq("id", personaId).single();
  if (error || !data) return error?.code === "PGRST116" ? NextResponse.json({ error: "Not found" }, { status: 404 }) : jsonError(error);
  return NextResponse.json({ persona: personaJson(data) });
}

export async function PATCH(request: Request, { params }: PersonaRouteContext) {
  const { personaId } = await params;
  if (!UUID_RE.test(personaId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  try {
    const body = parsePersonaBody(await request.json(), true);
    if (!Object.keys(body).length) return NextResponse.json({ error: "No editable fields" }, { status: 400 });
    const update = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.height !== undefined && { height: body.height }),
      ...(body.weight !== undefined && { weight: body.weight }),
      ...(body.gender !== undefined && { gender: body.gender }),
      ...(body.eyeColor !== undefined && { eye_color: body.eyeColor }),
      ...(body.heightProfile !== undefined && { height_profile: body.heightProfile }),
      ...(body.bodyBuild !== undefined && { body_build: body.bodyBuild }),
      ...(body.figureType !== undefined && { figure_type: body.figureType }),
      ...(body.bustSize !== undefined && { bust_size: body.bustSize }),
      ...(body.physique !== undefined && { physique: body.physique }),
    };
    const { data, error } = await db.from("personas").update(update).eq("id", personaId).select(PERSONA_SELECT).single();
    if (error || !data) return error?.code === "PGRST116" ? NextResponse.json({ error: "Not found" }, { status: 404 }) : jsonError(error);
    return NextResponse.json({ persona: personaJson(data) });
  } catch (error) {
    if (invalidInput(error) || error instanceof SyntaxError) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: PersonaRouteContext) {
  const { personaId } = await params;
  if (!UUID_RE.test(personaId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const rpcArgs = { p_persona_id: personaId };
  const { data: storagePrefix, error: prepareError } = await db.rpc("prepare_persona_deletion", rpcArgs);
  if (prepareError) return jsonError(prepareError, "Could not prepare Persona deletion");

  try {
    await deletePrivatePrefix(storagePrefix);
  } catch (storageError) {
    const { error: cancelError } = await db.rpc("cancel_persona_deletion", rpcArgs);
    if (cancelError) console.error("Could not cancel Persona deletion reservation", cancelError);
    console.error("Persona storage prefix cleanup failed", storageError);
    return NextResponse.json({ error: "Could not delete Persona storage" }, { status: 502 });
  }

  const { error: deleteError } = await db.rpc("delete_persona", rpcArgs);
  if (deleteError) return jsonError(deleteError, "Could not finalize Persona deletion");
  return NextResponse.json({ deleted: true, storageCleaned: true });
}
