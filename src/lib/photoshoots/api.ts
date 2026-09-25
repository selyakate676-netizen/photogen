import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getOptionalEnv, getS3BucketName } from "@/lib/env";
import { getPhotoPackForHistory } from "@/lib/photoPacks";
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

function allowedResultKey(photoshootId: string, key: string) {
  return key.startsWith(`photoshoots/generations/${photoshootId}/`)
    || key.startsWith(`photoshoots/${photoshootId}/`);
}

function isBegetStorageHost(hostname: string) {
  return /(^|\.)s3\.[a-z0-9-]+\.storage\.beget\.cloud$/i.test(hostname);
}

function storedResult(photoshootId: string, value: string): { key?: string; external?: string } | null {
  if (!/^https?:\/\//i.test(value)) {
    const key = value.replace(/^\/+/, "");
    return allowedResultKey(photoshootId, key) ? { key } : null;
  }

  let url: URL;
  let endpoint: URL;
  try {
    url = new URL(value);
    endpoint = new URL(getOptionalEnv("S3_ENDPOINT", "https://s3.ru1.storage.beget.cloud") as string);
  } catch {
    return null;
  }

  if (!isBegetStorageHost(url.hostname)) return { external: value };

  const bucket = getS3BucketName();
  const pathStyle = url.protocol === endpoint.protocol && url.host === endpoint.host;
  const virtualHosted = url.protocol === endpoint.protocol
    && url.hostname === `${bucket}.${endpoint.hostname}`
    && url.port === endpoint.port;
  if (!pathStyle && !virtualHosted) return null;

  let key: string;
  try {
    key = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  } catch {
    return null;
  }
  if (pathStyle) {
    const bucketPrefix = `${bucket}/`;
    if (!key.startsWith(bucketPrefix)) return null;
    key = key.slice(bucketPrefix.length);
  }

  return allowedResultKey(photoshootId, key) ? { key } : null;
}

export async function resultImageUrls(photoshootId: string, values: string[]): Promise<string[]> {
  return Promise.all(values.map(async (value) => {
    const result = storedResult(photoshootId, value);
    if (!result) return null;
    if (result.external) return result.external;
    return getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: getS3BucketName(), Key: result.key as string }),
      { expiresIn: 900 },
    );
  })).then((urls) => urls.filter((url): url is string => url !== null));
}

export async function photoshootHistoryJson(row: Photoshoot) {
  const packageSnapshot = objectSnapshot(row.package_snapshot);
  const personaSnapshot = objectSnapshot(row.persona_snapshot);
  const fallbackPack = getPhotoPackForHistory(row.style_id);

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
