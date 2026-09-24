import { NextResponse } from "next/server";
import { reconcileDeletionTasks } from "@/lib/deletion-tasks";
import { authenticatedDb, jsonError } from "@/lib/personas/api";

export async function POST() {
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  try {
    return NextResponse.json(await reconcileDeletionTasks(db, user.id));
  } catch (error) {
    return jsonError(error, "Could not reconcile deletion tasks");
  }
}
