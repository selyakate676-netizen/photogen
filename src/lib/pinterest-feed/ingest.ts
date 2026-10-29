import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getShortNanoPackDefinition } from "../ai/short-pack-prompts.ts";
import { photoPacks } from "../photoPacks.ts";

const MAX_REQUEST_AGE_SECONDS = 5 * 60;
const SHA256 = /^[a-f0-9]{64}$/;
const BUNDLE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const PACK_ID = /^SP-\d{3}$/;
const HERO_ID = /^HC-\d{3}$/;
const PREVIEW_PATH = /^\/package-previews\/[a-z0-9][a-z0-9-]*\.jpg$/;

export type PinterestFeedEvent = Readonly<{
  schemaVersion: 1;
  bundleId: string;
  bundleSha256: string;
  packId: string;
  heroCompositionId: string;
  packUrl: string;
  previewPath: string;
  previewSha256: string;
  telegramChannelMessageId: number;
  telegramCommentMessageId: number;
  telegramPromptUrl: string;
  pinterestExcluded: false;
}>;

export type PinterestFeedRecord = PinterestFeedEvent & Readonly<{
  contentSha256: string;
}>;

export interface PinterestFeedStore {
  find(bundleId: string): Promise<PinterestFeedRecord | null>;
  insert(record: PinterestFeedRecord): Promise<"inserted" | "conflict">;
}

export function verifyPinterestFeedSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const timestampValue = headers.get("x-photogen-timestamp");
  const supplied = headers.get("x-photogen-signature");
  const timestamp = Number(timestampValue);
  if (!secret || !timestampValue || !supplied || !rawBody || !Number.isSafeInteger(timestamp)) return false;
  if (Math.abs(nowSeconds - timestamp) > MAX_REQUEST_AGE_SECONDS || !SHA256.test(supplied)) return false;
  const expected = createHmac("sha256", secret).update(`${timestampValue}.${rawBody}`).digest("hex");
  const actualBuffer = Buffer.from(supplied, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function parsePackUrl(value: unknown, expectedSlug: string): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "photogenlab.ru"
      && url.port === ""
      && url.username === ""
      && url.password === ""
      && url.search === ""
      && url.hash === ""
      && url.pathname === `/packs/${expectedSlug}`;
  } catch {
    return false;
  }
}

function parsePromptUrl(value: unknown, channelMessageId: number, commentMessageId: number): value is string {
  return value === `https://t.me/photogeniclab/${channelMessageId}?comment=${commentMessageId}`;
}

export async function validatePinterestFeedEvent(
  value: unknown,
  publicRoot = path.join(process.cwd(), "public"),
): Promise<PinterestFeedEvent> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_EVENT");
  const event = value as Record<string, unknown>;
  const keys = [
    "schemaVersion", "bundleId", "bundleSha256", "packId", "heroCompositionId",
    "packUrl", "previewPath", "previewSha256", "telegramChannelMessageId",
    "telegramCommentMessageId", "telegramPromptUrl", "pinterestExcluded",
  ] as const;
  if (!exactKeys(event, keys)) throw new Error("INVALID_EVENT_FIELDS");
  if (event.schemaVersion !== 1
    || typeof event.bundleId !== "string" || !BUNDLE_ID.test(event.bundleId)
    || typeof event.bundleSha256 !== "string" || !SHA256.test(event.bundleSha256)
    || typeof event.packId !== "string" || !PACK_ID.test(event.packId)
    || typeof event.heroCompositionId !== "string" || !HERO_ID.test(event.heroCompositionId)
    || typeof event.previewPath !== "string" || !PREVIEW_PATH.test(event.previewPath)
    || typeof event.previewSha256 !== "string" || !SHA256.test(event.previewSha256)
    || !positiveInteger(event.telegramChannelMessageId)
    || !positiveInteger(event.telegramCommentMessageId)
    || event.pinterestExcluded !== false) throw new Error("INVALID_EVENT");

  const definition = getShortNanoPackDefinition(event.packId);
  if (!definition) throw new Error("UNKNOWN_PACK");
  const hero = definition.heroCompositions.find(({ heroCompositionId }) => heroCompositionId === event.heroCompositionId);
  if (!hero) throw new Error("UNKNOWN_HERO_COMPOSITION");
  const pack = photoPacks.find(({ id }) => id === definition.styleId);
  if (!pack || !parsePackUrl(event.packUrl, pack.slug)) throw new Error("INVALID_PACK_URL");

  const heroNumber = event.heroCompositionId.slice(3).toLowerCase();
  if (!pack.gallery.includes(event.previewPath) || !event.previewPath.endsWith(`-hc${heroNumber}.jpg`)) {
    throw new Error("INVALID_PREVIEW_PATH");
  }
  const absolutePreview = path.resolve(publicRoot, `.${event.previewPath}`);
  const previewRoot = path.resolve(publicRoot, "package-previews") + path.sep;
  if (!absolutePreview.startsWith(previewRoot)) throw new Error("INVALID_PREVIEW_PATH");
  let bytes: Buffer;
  try {
    bytes = await readFile(absolutePreview);
  } catch {
    throw new Error("PREVIEW_NOT_FOUND");
  }
  if (createHash("sha256").update(bytes).digest("hex") !== event.previewSha256) {
    throw new Error("PREVIEW_SHA256_MISMATCH");
  }
  if (!parsePromptUrl(event.telegramPromptUrl, event.telegramChannelMessageId, event.telegramCommentMessageId)) {
    throw new Error("INVALID_TELEGRAM_PROMPT_URL");
  }
  return {
    schemaVersion: 1,
    bundleId: event.bundleId,
    bundleSha256: event.bundleSha256,
    packId: event.packId,
    heroCompositionId: event.heroCompositionId,
    packUrl: event.packUrl,
    previewPath: event.previewPath,
    previewSha256: event.previewSha256,
    telegramChannelMessageId: event.telegramChannelMessageId,
    telegramCommentMessageId: event.telegramCommentMessageId,
    telegramPromptUrl: event.telegramPromptUrl,
    pinterestExcluded: false,
  };
}

export function eventContentSha256(event: PinterestFeedEvent): string {
  return createHash("sha256").update(JSON.stringify(event), "utf8").digest("hex");
}

export async function ingestPinterestFeedEvent(
  event: PinterestFeedEvent,
  store: PinterestFeedStore,
): Promise<"created" | "existing" | "conflict"> {
  const record: PinterestFeedRecord = { ...event, contentSha256: eventContentSha256(event) };
  const existing = await store.find(event.bundleId);
  if (existing) return existing.contentSha256 === record.contentSha256 ? "existing" : "conflict";
  const result = await store.insert(record);
  if (result === "inserted") return "created";
  const concurrent = await store.find(event.bundleId);
  return concurrent?.contentSha256 === record.contentSha256 ? "existing" : "conflict";
}
