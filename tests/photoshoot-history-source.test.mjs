import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

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

test("result images normalize only owner-scoped Beget objects and receive fresh signatures", async () => {
  const source = await read("src/lib/photoshoots/api.ts");

  assert.match(source, /photoshoots\/generations\/\$\{photoshootId\}\//);
  assert.match(source, /photoshoots\/\$\{photoshootId\}\//);
  assert.match(source, /isBegetStorageHost\(url\.hostname\)/);
  assert.match(source, /url\.host === endpoint\.host/);
  assert.match(source, /url\.hostname === `\$\{bucket\}\.\$\{endpoint\.hostname\}`/);
  assert.match(source, /decodeURIComponent\(url\.pathname\)/);
  assert.match(source, /if \(!key\.startsWith\(bucketPrefix\)\) return null/);
  assert.match(source, /if \(!isBegetStorageHost[\s\S]*?return \{ external: value \}/);
  assert.match(source, /new GetObjectCommand\(\{ Bucket: getS3BucketName\(\), Key:/);
  assert.match(source, /expiresIn: 900/);
});

test("result image mapper handles current, legacy, external and foreign values", async () => {
  const source = await read("src/lib/photoshoots/api.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  class GetObjectCommand {
    constructor(input) { this.input = input; }
  }
  const testModule = { exports: {} };
  const require = (specifier) => ({
    "@aws-sdk/client-s3": { GetObjectCommand },
    "@aws-sdk/s3-request-presigner": {
      getSignedUrl: async (_client, command) => `signed:${command.input.Key}`,
    },
    "@/lib/env": {
      getOptionalEnv: () => "https://s3.ru1.storage.beget.cloud",
      getS3BucketName: () => "private-bucket",
    },
    "@/lib/photoPacks": { getPhotoPackForHistory: () => null },
    "@/lib/photoshoots/status": { SAFE_GENERATION_ERROR: { code: "FAILED", message: "Failed" } },
    "@/lib/s3": { s3Client: {} },
  })[specifier];
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})(require,testModule,testModule.exports);`, {
    require, testModule, URL,
  });
  const { resultImageUrls } = testModule.exports;
  const id = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";

  assert.deepEqual(Array.from(await resultImageUrls(id, [
    `photoshoots/generations/${id}/current.jpg`,
  ])), [`signed:photoshoots/generations/${id}/current.jpg`]);
  assert.deepEqual(Array.from(await resultImageUrls(id, [
    `https://s3.ru1.storage.beget.cloud/private-bucket/photoshoots/${id}/legacy.jpg`,
  ])), [`signed:photoshoots/${id}/legacy.jpg`]);
  assert.deepEqual(Array.from(await resultImageUrls(id, [
    `https://private-bucket.s3.ru1.storage.beget.cloud/photoshoots/generations/${id}/virtual.jpg`,
  ])), [`signed:photoshoots/generations/${id}/virtual.jpg`]);
  assert.deepEqual(Array.from(await resultImageUrls(id, ["https://provider.example/result.jpg"])), [
    "https://provider.example/result.jpg",
  ]);
  assert.deepEqual(Array.from(await resultImageUrls(id, [
    `photoshoots/generations/${other}/foreign.jpg`,
    `https://s3.ru1.storage.beget.cloud/private-bucket/photoshoots/${other}/foreign.jpg`,
  ])), []);
});

test("generated list and result detail use the shared signed result mapper", async () => {
  const [generated, detail] = await Promise.all([
    read("src/app/account/generated/page.tsx"),
    read("src/app/dashboard/result/[id]/page.tsx"),
  ]);

  for (const source of [generated, detail]) {
    assert.match(source, /resultImageUrls/);
    assert.doesNotMatch(source, /`\$\{s3Endpoint\}\/\$\{bucket\}/);
    assert.doesNotMatch(source, /getImageUrl/);
  }
});
