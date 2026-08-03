/* eslint-disable @typescript-eslint/no-explicit-any */
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getS3BucketName } from "@/lib/env";
import { s3Client } from "@/lib/s3";
import { createClient } from "@/utils/supabase/server";
import {
  BODY_BUILDS,
  BUST_SIZES,
  FIGURE_TYPES,
  HEIGHT_PROFILES,
  PHYSIQUES,
  isAllowedPersonaAppearanceValue,
} from "@/lib/personas/appearance";

export const PERSONA_SELECT = "id,user_id,name,is_default,height,weight,gender,eye_color,height_profile,body_build,figure_type,bust_size,physique,status,created_at,updated_at";
export const PHOTO_SELECT = "id,persona_id,storage_path,sort_order,created_at";
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function authenticatedDb() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return { db: client as any, user };
}

export function jsonError(error: unknown, fallback = "Request failed") {
  const value = error as { code?: string; message?: string } | null;
  const message = value?.message ?? fallback;
  if (message.includes("NOT_FOUND") || value?.code === "P0002") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (value?.code === "23505" || value?.code === "23514") return NextResponse.json({ error: message }, { status: 409 });
  if (value?.code === "22P02" || value?.code === "22001" || value?.code === "23502") return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  if (value?.code === "42501") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  console.error("Persona API error:", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function parsePersonaBody(value: unknown, partial = false) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_BODY");
  const body = value as Record<string, unknown>;
  const result: Record<string, string | number | null> = {};
  if (!partial || "name" in body) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) throw new Error("INVALID_NAME");
    result.name = body.name.trim();
  }
  for (const [key, min, max] of [["height", 120, 230], ["weight", 35, 250]] as const) {
    if (key in body) {
      if (body[key] !== null && (!Number.isInteger(body[key]) || (body[key] as number) < min || (body[key] as number) > max)) throw new Error(`INVALID_${key.toUpperCase()}`);
      result[key] = body[key] as number | null;
    }
  }
  if ("gender" in body) {
    if (body.gender !== null && body.gender !== "woman" && body.gender !== "man") throw new Error("INVALID_GENDER");
    result.gender = body.gender as string | null;
  }
  if ("eyeColor" in body) {
    if (body.eyeColor !== null && (typeof body.eyeColor !== "string" || !body.eyeColor.trim() || body.eyeColor.trim().length > 40)) throw new Error("INVALID_EYE_COLOR");
    result.eyeColor = typeof body.eyeColor === "string" ? body.eyeColor.trim() : null;
  }
  for (const [key, allowed] of [
    ["heightProfile", HEIGHT_PROFILES],
    ["bodyBuild", BODY_BUILDS],
    ["figureType", FIGURE_TYPES],
    ["bustSize", BUST_SIZES],
    ["physique", PHYSIQUES],
  ] as const) {
    if (key in body) {
      if (body[key] !== null && !isAllowedPersonaAppearanceValue(body[key], allowed)) {
        throw new Error(`INVALID_${key.toUpperCase()}`);
      }
      result[key] = body[key] as string | null;
    }
  }
  return result;
}

export function personaJson(row: any) {
  return { id: row.id, userId: row.user_id, name: row.name, isDefault: row.is_default, height: row.height, weight: row.weight, gender: row.gender, eyeColor: row.eye_color, heightProfile: row.height_profile, bodyBuild: row.body_build, figureType: row.figure_type, bustSize: row.bust_size, physique: row.physique, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function photoJson(row: any) {
  return { id: row.id, personaId: row.persona_id, sortOrder: row.sort_order, createdAt: row.created_at };
}
export async function deletePrivateObjects(paths: string[]) {
  const results = await Promise.allSettled(paths.map((Key) => s3Client.send(new DeleteObjectCommand({ Bucket: getS3BucketName(), Key }))));
  const failed = results.filter((item) => item.status === "rejected");
  if (failed.length) console.error("Persona storage cleanup failed", failed);
  return failed.length === 0;
}
export async function isPersonaPhotoReferencedBySnapshot(db: any, storagePath: string) {
  const { data, error } = await db
    .from("photoshoots")
    .select("id")
    .contains("persona_snapshot", { photos: [storagePath] })
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export function invalidInput(error: unknown) {
  return error instanceof Error && error.message.startsWith("INVALID_");
}
