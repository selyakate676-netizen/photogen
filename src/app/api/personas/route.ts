import { NextResponse } from "next/server";
import { authenticatedDb, invalidInput, jsonError, parsePersonaBody, personaJson, PERSONA_SELECT } from "@/lib/personas/api";

export async function GET() {
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const { data, error } = await db.from("personas").select(PERSONA_SELECT).order("created_at");
  if (error) return jsonError(error);
  return NextResponse.json({ personas: data.map(personaJson) });
}

export async function POST(request: Request) {
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  try {
    const body = parsePersonaBody(await request.json());
    const { data, error } = await db.rpc("create_persona", { p_name: body.name, p_height: body.height ?? null, p_weight: body.weight ?? null, p_gender: body.gender ?? null, p_eye_color: body.eyeColor ?? null });
    if (error) return jsonError(error, "Could not create persona");

    const appearanceUpdate = {
      ...(body.heightProfile !== undefined && { height_profile: body.heightProfile }),
      ...(body.bodyBuild !== undefined && { body_build: body.bodyBuild }),
      ...(body.figureType !== undefined && { figure_type: body.figureType }),
      ...(body.bustSize !== undefined && { bust_size: body.bustSize }),
      ...(body.physique !== undefined && { physique: body.physique }),
    };
    let created = data[0];
    if (Object.keys(appearanceUpdate).length > 0) {
      const { data: updated, error: updateError } = await db.from("personas").update(appearanceUpdate).eq("id", created.id).select(PERSONA_SELECT).single();
      if (updateError || !updated) return jsonError(updateError, "Could not save persona appearance");
      created = updated;
    }
    return NextResponse.json({ persona: personaJson(created) }, { status: 201 });
  } catch (error) {
    if (invalidInput(error) || error instanceof SyntaxError) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    return jsonError(error);
  }
}
