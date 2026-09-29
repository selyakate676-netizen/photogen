import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const logger = fs.readFileSync("src/lib/ai/generation-log.ts", "utf8");
const orchestration = fs.readFileSync("src/lib/photoshoots/orchestration.ts", "utf8");
const status = fs.readFileSync("src/lib/photoshoots/status.ts", "utf8");
const adapter = fs.readFileSync("src/lib/ai/mvp-generation-adapter.ts", "utf8");
const webhook = fs.readFileSync(
  "src/app/api/webhooks/replicate/generation/route.ts",
  "utf8",
);
const productionDiagnostics = [logger, orchestration, status, adapter, webhook].join("\n");

test("generation diagnostics cover every production pipeline stage", () => {
  for (const stage of [
    "photoshoot",
    "claim",
    "wallet_payment_gate",
    "provider_call",
    "prediction",
    "webhook",
    "result",
  ]) {
    assert.match(productionDiagnostics, new RegExp(`"${stage}"`));
  }
});

test("generation diagnostics expose actionable safe error codes", () => {
  for (const code of [
    "INSUFFICIENT_CRYSTALS",
    "CLAIM_REJECTED",
    "PROVIDER_AUTH_ERROR",
    "PROVIDER_ERROR",
    "WEBHOOK_VERIFICATION_ERROR",
    "WEBHOOK_ERROR",
  ]) {
    assert.match(productionDiagnostics, new RegExp(`"${code}"`));
  }
});

test("structured generation log schema cannot accept sensitive context", () => {
  assert.match(logger, /event,\s*stage,\s*photoshoot_id: photoshootId/);
  assert.match(logger, /error_code: errorCode/);
  const serializer = logger.slice(logger.indexOf("export function logGenerationEvent"), logger.indexOf("export function getClaimErrorCode"));
  assert.doesNotMatch(serializer, /prompt|payload|sourceUrl|signedUrl|token|secret|personal/i);
  assert.doesNotMatch(logger, /\.\.\.context|metadata|details|cause/);
});

test("generation paths no longer log raw provider, claim, or webhook errors", () => {
  assert.doesNotMatch(status, /Could not claim photoshoot generation/);
  assert.doesNotMatch(orchestration, /Provider start failed:/);
  assert.doesNotMatch(webhook, /Generation Webhook error:|predictionId:/);
  const logStatements = productionDiagnostics
    .split(/\r?\n/)
    .filter((line) => line.includes("logGenerationEvent(") || line.includes("console."))
    .join("\n");
  assert.doesNotMatch(logStatements, /prompt|payload|sourceUrl|signedUrl|token|secret|personal/i);
});
