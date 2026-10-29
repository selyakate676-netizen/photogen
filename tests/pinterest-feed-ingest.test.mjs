import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ingestPinterestFeedEvent,
  validatePinterestFeedEvent,
  verifyPinterestFeedSignature,
} from "../src/lib/pinterest-feed/ingest.ts";

const secret = "test-only-pinterest-feed-secret";
const now = 1_800_000_000;
const previewPath = "/package-previews/sp032-birthday-projection-model-b-hc001.jpg";
const previewFile = new URL(`../public${previewPath}`, import.meta.url);

async function validEvent() {
  const bytes = await readFile(previewFile);
  return {
    schemaVersion: 1,
    bundleId: "pg_test_bundle_001",
    bundleSha256: "a".repeat(64),
    packId: "SP-032",
    heroCompositionId: "HC-001",
    packUrl: "https://photogenlab.ru/packs/birthday-projection",
    previewPath,
    previewSha256: createHash("sha256").update(bytes).digest("hex"),
    telegramChannelMessageId: 101,
    telegramCommentMessageId: 102,
    telegramPromptUrl: "https://t.me/photogeniclab/101?comment=102",
    pinterestExcluded: false,
  };
}

function signedHeaders(body, timestamp = now) {
  return new Headers({
    "x-photogen-timestamp": String(timestamp),
    "x-photogen-signature": createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex"),
  });
}

class MemoryStore {
  records = new Map();
  async find(bundleId) { return this.records.get(bundleId) ?? null; }
  async insert(record) {
    if (this.records.has(record.bundleId)) return "conflict";
    this.records.set(record.bundleId, record);
    return "inserted";
  }
}

test("requires an exact current HMAC over the raw request body", () => {
  const body = JSON.stringify({ bundleId: "x" });
  assert.equal(verifyPinterestFeedSignature(body, signedHeaders(body), secret, now), true);
  assert.equal(verifyPinterestFeedSignature(`${body} `, signedHeaders(body), secret, now), false);
  assert.equal(verifyPinterestFeedSignature(body, new Headers(), secret, now), false);
  assert.equal(verifyPinterestFeedSignature(body, signedHeaders(body, now - 301), secret, now), false);
});

test("validates catalog membership and the real production preview SHA-256", async () => {
  const event = await validEvent();
  assert.deepEqual(await validatePinterestFeedEvent(event), event);
  await assert.rejects(validatePinterestFeedEvent({ ...event, previewSha256: "b".repeat(64) }), /PREVIEW_SHA256_MISMATCH/);
  await assert.rejects(validatePinterestFeedEvent({ ...event, heroCompositionId: "HC-999" }), /UNKNOWN_HERO_COMPOSITION/);
});

test("rejects external pack URLs and arbitrary preview paths", async () => {
  const event = await validEvent();
  await assert.rejects(validatePinterestFeedEvent({ ...event, packUrl: "https://evil.example/packs/birthday-projection" }), /INVALID_PACK_URL/);
  await assert.rejects(validatePinterestFeedEvent({ ...event, previewPath: "/../secrets.jpg" }), /INVALID_EVENT/);
  await assert.rejects(validatePinterestFeedEvent({ ...event, previewPath: "/package-previews/sp031-flowers-model-b-hc001.jpg" }), /INVALID_PREVIEW_PATH/);
});

test("is idempotent for identical bundle content and rejects conflicts", async () => {
  const event = await validatePinterestFeedEvent(await validEvent());
  const store = new MemoryStore();
  assert.equal(await ingestPinterestFeedEvent(event, store), "created");
  assert.equal(await ingestPinterestFeedEvent(event, store), "existing");
  assert.equal(store.records.size, 1);
  const changed = { ...event, telegramChannelMessageId: 999, telegramPromptUrl: "https://t.me/photogeniclab/999?comment=102" };
  assert.equal(await ingestPinterestFeedEvent(changed, store), "conflict");
  assert.equal(store.records.size, 1);
});

test("normalizes JSON key order before calculating idempotency", async () => {
  const input = await validEvent();
  const reordered = Object.fromEntries(Object.entries(input).reverse());
  const first = await validatePinterestFeedEvent(input);
  const second = await validatePinterestFeedEvent(reordered);
  const store = new MemoryStore();
  assert.equal(await ingestPinterestFeedEvent(first, store), "created");
  assert.equal(await ingestPinterestFeedEvent(second, store), "existing");
});

test("a failed ingest has no Telegram dependency or side effect", async () => {
  const source = await readFile(new URL("../src/lib/pinterest-feed/ingest.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/internal/pinterest-feed/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source + route, /telegram.*(?:send|post)|sendPhoto|sendMessage|api\.telegram\.org/i);
});

test("migration enforces unique bundle IDs and keeps the table private", async () => {
  const sql = await readFile(new URL("../supabase_pinterest_feed_items.sql", import.meta.url), "utf8");
  assert.match(sql, /bundle_id text not null unique/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.pinterest_feed_items from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /grant .* to (?:anon|authenticated)/i);
});
