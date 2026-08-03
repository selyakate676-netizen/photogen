import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3BucketName } from "@/lib/env";
import { getPhotoPack } from "@/lib/photoPacks";
import { SAFE_GENERATION_ERROR } from "@/lib/photoshoots/status";
import { s3Client } from "@/lib/s3";
import type { Json, Photoshoot } from "@/types/database";

export const PHOTOSHOOT_HISTORY_SELECT = [
  "id",
  "persona_id",
  "persona_snapshot",
  "style_id",
  "status",
  "result_images",
  "safe_error",
  "requested_images_count",
  "package_snapshot",
  "created_at",
  "completed_at",
].join(",");

type SnapshotObject = Record<string, Json | undefined>;

function objectSnapshot(value: Json | null): SnapshotObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as SnapshotObject
    : null;
}

function snapshotString(snapshot: SnapshotObject | null, key: string): string | null {
  const value = snapshot?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function resultImageUrls(photoshootId: string, keys: string[]): Promise<string[]> {
  const prefix = `photoshoots/generations/${photoshootId}/`;
  const safeKeys = keys.filter((key) => key.startsWith(prefix));
  return Promise.all(safeKeys.map((key) => getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: getS3BucketName(), Key: key }),
    { expiresIn: 900 },
  )));
}

export async function photoshootHistoryJson(row: Photoshoot) {
  const packageSnapshot = objectSnapshot(row.package_snapshot);
  const personaSnapshot = objectSnapshot(row.persona_snapshot);
  const fallbackPack = getPhotoPack(row.style_id);

  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    package: {
      id: snapshotString(packageSnapshot, "id") ?? fallbackPack?.id ?? row.style_id,
      slug: snapshotString(packageSnapshot, "slug") ?? fallbackPack?.slug ?? row.style_id,
      name: snapshotString(packageSnapshot, "name") ?? fallbackPack?.title ?? row.style_id,
    },
    requestedImagesCount: row.requested_images_count,
    resultImages: await resultImageUrls(row.id, row.result_images ?? []),
    safeError: row.status === "failed"
      ? {
          code: SAFE_GENERATION_ERROR.code,
          message: row.safe_error || SAFE_GENERATION_ERROR.message,
        }
      : null,
    persona: {
      id: row.persona_id,
      name: snapshotString(personaSnapshot, "name"),
    },
  };
}
