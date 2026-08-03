import { NextResponse } from "next/server";
import { authenticatedDb, jsonError, personaJson, UUID_RE } from "@/lib/personas/api";

type PersonaRouteContext = { params: Promise<{ personaId: string }> };

export async function POST(_request: Request, { params }: PersonaRouteContext) {
  const { personaId } = await params;
  if (!UUID_RE.test(personaId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const { data, error } = await db.rpc("set_default_persona", { p_persona_id: personaId });
  if (error) return jsonError(error, "Could not set default persona");
  return NextResponse.json({ persona: personaJson(data[0]) });
}
