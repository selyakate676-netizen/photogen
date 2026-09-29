import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  logReplicateWebhook,
  verifyReplicateWebhook,
} from "../src/lib/replicate/webhook-security.ts";

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
const signingKey = Buffer.from("replicate-webhook-test-key");
const secret = `whsec_${signingKey.toString("base64")}`;
const now = 1_800_000_000;
const body = JSON.stringify({ id: "prediction-id", status: "succeeded", output: ["https://example.invalid/result"] });

function signedHeaders(bodyValue = body, timestamp = now) {
  const id = "msg_test";
  const signature = createHmac("sha256", signingKey)
    .update(`${id}.${timestamp}.${bodyValue}`)
    .digest("base64");

  return new Headers({
    "webhook-id": id,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": `v1,${signature}`,
  });
}

test("accepts a current Replicate HMAC over the exact raw body", () => {
  assert.equal(verifyReplicateWebhook(signedHeaders(), body, secret, now), true);
});

test("rejects tampered body, stale timestamp, missing headers, and a non-signing secret", () => {
  assert.equal(verifyReplicateWebhook(signedHeaders(), body + " ", secret, now), false);
  assert.equal(verifyReplicateWebhook(signedHeaders(body, now - 301), body, secret, now), false);
  assert.equal(verifyReplicateWebhook(new Headers(), body, secret, now), false);
  assert.equal(verifyReplicateWebhook(signedHeaders(), body, "legacy-query-secret", now), false);
});

test("safe logger emits only an allowlisted code and normalized provider status", () => {
  const calls = [];
  const original = console.error;
  console.error = (...args) => calls.push(args);
  try {
    logReplicateWebhook("error", "PROVIDER_OUTPUT_INVALID", "succeeded");
    logReplicateWebhook("error", "WEBHOOK_PROCESSING_FAILED", "provider-secret-status");
  } finally {
    console.error = original;
  }

  assert.deepEqual(calls, [
    ["[replicate]", { code: "PROVIDER_OUTPUT_INVALID", status: "succeeded" }],
    ["[replicate]", { code: "WEBHOOK_PROCESSING_FAILED" }],
  ]);
});

test("webhook routes verify raw bodies and no producer puts secrets in URLs", async () => {
  const files = await Promise.all([
    read("src/app/api/webhooks/replicate/generation/route.ts"),
    read("src/app/api/webhooks/replicate/training/route.ts"),
    read("src/lib/ai/generation.ts"),
    read("src/lib/ai/training.ts"),
    read("src/lib/ai/mvp-generation-adapter.ts"),
  ]);
  const combined = files.join("\n");

  for (const route of files.slice(0, 2)) {
    assert.match(route, /const rawBody = await request\.text\(\)/);
    assert.match(route, /verifyReplicateWebhook\(request\.headers, rawBody,/);
    assert.match(route, /JSON\.parse\(rawBody\)/);
    assert.doesNotMatch(route, /request\.json\(\)/);
  }

  assert.doesNotMatch(combined, /[?&]secret=/);
  assert.doesNotMatch(combined, /getWebhookSecret/);
  assert.doesNotMatch(combined, /console\.(?:log|warn|error)\(/);
  assert.doesNotMatch(combined, /JSON\.stringify\(resultData\)/);
});