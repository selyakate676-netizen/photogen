import { NextResponse } from "next/server";
import { authenticatedDb, deletePrivateObjects, invalidInput, jsonError, parsePersonaBody, personaJson, PERSONA_SELECT, UUID_RE } from "@/lib/personas/api";

export async function GET(_request: Request, { params }: RouteContext<"/api/personas/[personaId]">) {
  const { personaId } = await params;
  if (!UUID_RE.test(personaId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const { data, error } = await db.from("personas").select(PERSONA_SELECT).eq("id", personaId).single();
  if (error || !data) return error?.code === "PGRST116" ? NextResponse.json({ error: "Not found" }, { status: 404 }) : jsonError(error);
  return NextResponse.json({ persona: personaJson(data) });
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/personas/[personaId]">) {
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

export async function DELETE(_request: Request, { params }: RouteContext<"/api/personas/[personaId]">) {
  const { personaId } = await params;
  if (!UUID_RE.test(personaId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const { data, error } = await db.rpc("delete_persona", { p_persona_id: personaId });
  if (error) return jsonError(error, "Could not delete persona");
  const storageCleaned = await deletePrivateObjects(data ?? []);
  return NextResponse.json({ deleted: true, storageCleaned });
}
