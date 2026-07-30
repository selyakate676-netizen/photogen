import { NextResponse } from "next/server";
import { authenticatedDb, jsonError, personaJson } from "@/lib/personas/api";

export async function POST() {
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const { data, error } = await db.rpc("create_persona", { p_name: null, p_height: null, p_weight: null, p_gender: null, p_eye_color: null });
  if (error) return jsonError(error, "Could not initialize persona");
  return NextResponse.json({ persona: personaJson(data[0]) });
}
