import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { getS3BucketName } from "@/lib/env";
import { authenticatedDb, jsonError, photoJson, PHOTO_SELECT, UUID_RE } from "@/lib/personas/api";
import { s3Client } from "@/lib/s3";
import { ImageUploadValidationError, validateImageUpload } from "@/lib/uploads/image";

type PersonaRouteContext = { params: Promise<{ personaId: string }> };

export async function GET(_request: Request, { params }: PersonaRouteContext) {
  const { personaId } = await params;
  if (!UUID_RE.test(personaId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const { data: persona } = await db.from("personas").select("id").eq("id", personaId).single();
  if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let { data, error } = await db.from("persona_photos").select(PHOTO_SELECT).eq("persona_id", personaId).order("sort_order");
  // Keep existing profiles readable until the additive Persona Photos 2.0 migration is applied.
  if (error?.code === "42703") {
    const legacy = await db.from("persona_photos").select("id,persona_id,storage_path,created_at").eq("persona_id", personaId).order("created_at");
    data = legacy.data;
    error = legacy.error;
  }
  if (error) return jsonError(error);
  try {
    const photos = await Promise.all(data.map(async (row: { storage_path: string }) => ({
      ...photoJson(row),
      url: await getSignedUrl(s3Client, new GetObjectCommand({
        Bucket: getS3BucketName(),
        Key: row.storage_path,
      }), { expiresIn: 300 }),
    })));
    return NextResponse.json({ photos }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (signingError) {
    return jsonError(signingError, "Could not load photos");
  }
}

export async function POST(request: Request, { params }: PersonaRouteContext) {
  const { personaId } = await params;
  if (!UUID_RE.test(personaId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const { data: persona } = await db.from("personas").select("id").eq("id", personaId).single();
  if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  let image;
  try {
    image = await validateImageUpload(file);
  } catch (error) {
    if (error instanceof ImageUploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const key = `personas/${user.id}/${personaId}/${randomUUID()}.${image.extension}`;
  await s3Client.send(new PutObjectCommand({
    Bucket: getS3BucketName(),
    Key: key,
    Body: image.body,
    ContentType: image.contentType,
    ACL: "private",
  }));
  const { data, error } = await db.rpc("add_persona_photo", { p_persona_id: personaId, p_storage_path: key });
  if (error) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: getS3BucketName(), Key: key })).catch((cleanupError) => console.error("Uploaded persona photo cleanup failed", cleanupError));
    return jsonError(error, "Could not add photo");
  }
  return NextResponse.json({ photo: photoJson(data[0]) }, { status: 201 });
}
