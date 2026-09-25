import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { reconcileAllDeletionTasks } from "@/lib/deletion-tasks";
import { getDeletionReconcileSecret } from "@/lib/env";
import { jsonError } from "@/lib/personas/api";

function hasTrustedSecret(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7), "utf8");
  const expected = Buffer.from(getDeletionReconcileSecret(), "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(await reconcileAllDeletionTasks());
  } catch (error) {
    return jsonError(error, "Could not reconcile deletion tasks");
  }
}
