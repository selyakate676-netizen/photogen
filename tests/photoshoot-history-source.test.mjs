import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("photoshoot history uses the production schema and existing timestamps", async () => {
  const [api, listRoute] = await Promise.all([
    read("src/lib/photoshoots/api.ts"),
    read("src/app/api/photoshoots/route.ts"),
  ]);
  const historySelect = api.match(/export const PHOTOSHOOT_HISTORY_SELECT = \[[\s\S]*?\]\.join/)?.[0] ?? "";

  assert.doesNotMatch(historySelect, /updated_at/);
  assert.match(historySelect, /"created_at"/);
  assert.match(historySelect, /"completed_at"/);
  assert.doesNotMatch(api, /row\.updated_at/);
  assert.match(listRoute, /select\(PHOTOSHOOT_HISTORY_SELECT\)/);
  assert.match(listRoute, /order\("created_at", \{ ascending: false \}\)/);
});

test("photoshoot detail returns owner data through the shared safe mapper", async () => {
  const source = await read("src/app/api/photoshoots/[photoshootId]/route.ts");

  assert.match(source, /select\(PHOTOSHOOT_HISTORY_SELECT\)/);
  assert.match(source, /eq\("id", photoshootId\)/);
  assert.match(source, /photoshoot: await photoshootHistoryJson\(data as Photoshoot\)/);
  assert.match(source, /Cache-Control": "private, no-store"/);
});

test("missing and RLS-hidden photoshoots remain indistinguishable 404 responses", async () => {
  const source = await read("src/app/api/photoshoots/[photoshootId]/route.ts");

  assert.match(source, /if \(error\)[\s\S]*?error\.code === "PGRST116"[\s\S]*?status: 404/);
  assert.match(source, /if \(!data\)[\s\S]*?status: 404/);
  assert.match(source, /\{ error: "Not found" \}, \{ status: 404 \}/);
  assert.doesNotMatch(source, /createServiceRoleClient|service_role/);
});

test("photoshoot detail reports database failures as a safe 500", async () => {
  const source = await read("src/app/api/photoshoots/[photoshootId]/route.ts");
  const databaseErrorBranch = source.match(/if \(error\) \{[\s\S]*?\n  \}/)?.[0] ?? "";

  assert.match(databaseErrorBranch, /console\.error\("Photoshoot detail failed:", error\)/);
  assert.match(databaseErrorBranch, /\{ error: "Could not load photoshoot" \}, \{ status: 500 \}/);
  assert.doesNotMatch(databaseErrorBranch, /error\.(?:message|details|hint)/);
});

test("history and detail reads cannot invoke generation providers", async () => {
  const sources = await Promise.all([
    read("src/lib/photoshoots/api.ts"),
    read("src/app/api/photoshoots/route.ts"),
    read("src/app/api/photoshoots/[photoshootId]/route.ts"),
  ]);
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /replicate|startMvpGeneration|startQueuedPhotoshootGeneration|predictions\.create/i);
});
