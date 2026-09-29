import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { MAX_IMAGE_UPLOAD_BYTES, detectImageMime, validateImageUpload } from "../src/lib/uploads/image.ts";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const imageBytes = {
  "image/jpeg": Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00]),
  "image/png": Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/webp": Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x04, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
};

test("image validation accepts only matching JPEG, PNG and WebP signatures", async () => {
  for (const [type, bytes] of Object.entries(imageBytes)) {
    assert.equal(detectImageMime(bytes), type);
    const result = await validateImageUpload(new File([bytes], "untrusted-name.exe", { type }));
    assert.equal(result.contentType, type);
    assert.ok(["jpg", "png", "webp"].includes(result.extension));
  }
});

test("image validation rejects MIME spoofing and unknown bytes", async () => {
  await assert.rejects(validateImageUpload(new File([imageBytes["image/png"]], "fake.jpg", { type: "image/jpeg" })), /does not match/);
  await assert.rejects(validateImageUpload(new File([Uint8Array.from([1, 2, 3, 4])], "fake.jpg", { type: "image/jpeg" })), /does not match/);
});

test("image validation enforces the hard 15 MB limit before reading content", async () => {
  const oversized = new File([new Uint8Array(MAX_IMAGE_UPLOAD_BYTES + 1)], "large.jpg", { type: "image/jpeg" });
  await assert.rejects(validateImageUpload(oversized), (error) => error?.status === 413);
});

test("upload routes use validated bytes, private ACLs and UUID-only object names", async () => {
  const [direct, persona, presigned, client] = await Promise.all([
    read("src/app/api/upload/direct/route.ts"), read("src/app/api/personas/[personaId]/photos/route.ts"),
    read("src/app/api/upload/presigned/route.ts"), read("src/app/dashboard/new/PhotoUpload.tsx"),
  ]);
  for (const source of [direct, persona]) {
    assert.ok(source.includes("validateImageUpload(file)"));
    assert.ok(source.includes("randomUUID()"));
    assert.ok(source.includes('ACL: "private"'));
    assert.ok(!source.includes("Date.now()"));
    assert.ok(!source.includes("Key: file.name"));
  }
  assert.ok(presigned.includes("status: 410"));
  assert.ok(!presigned.includes("getSignedUrl"));
  assert.ok(!presigned.includes("PutObjectCommand"));
  assert.ok(client.includes("fetch('/api/upload/direct'"));
  assert.ok(!client.includes("/api/upload/presigned"));
});

test("owner-scoped result and source reads use short-lived signed URLs only", async () => {
  const [helper, generated, result, persona] = await Promise.all([
    read("src/lib/photoshoots/api.ts"), read("src/app/account/generated/page.tsx"),
    read("src/app/dashboard/result/[id]/page.tsx"), read("src/app/api/personas/[personaId]/photos/route.ts"),
  ]);
  assert.ok(helper.includes("photoshoots/generations/"));
  assert.ok(helper.includes("expiresIn: 900"));
  assert.ok(generated.includes(".eq('user_id', user.id)"));
  assert.ok(generated.includes("resultImageUrls("));
  assert.ok(!generated.includes("S3_ENDPOINT"));
  assert.ok(!generated.includes("getImageUrl"));
  assert.ok(result.includes(".eq('user_id', user.id)"));
  assert.ok(result.includes("resultImageUrls"));
  assert.ok(!result.includes("S3_ENDPOINT"));
  assert.ok(!result.includes("getImageUrl"));
  assert.ok(persona.indexOf('.from("personas")') < persona.indexOf("await getSignedUrl"));
  assert.ok(persona.includes("expiresIn: 300"));
});

test("targeted source and result writers never request public-read ACL", async () => {
  const sources = await Promise.all([
    read("src/app/api/upload/direct/route.ts"), read("src/app/api/personas/[personaId]/photos/route.ts"),
    read("src/lib/ai/pipeline/storage.ts"), read("src/lib/ai/mvp-generation-adapter.ts"),
  ]);
  assert.ok(!sources.join("\n").includes("public-read"));
});
