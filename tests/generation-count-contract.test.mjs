import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GenerationCountConfigurationError,
  createGenerationPlan,
  isExactInternalGenerationResultSet,
} from "../src/lib/ai/generation-count-contract.ts";
import {
  GPT_IMAGE_MODEL_ID,
  NANO_BANANA_2_MODEL_ID,
  buildReplicateImageInput,
} from "../src/lib/ai/image-generation-provider.ts";

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
const references = ["https://example.test/ref-a.jpg", "https://example.test/ref-b.jpg"];

function runMockPredictions(model, generationPlan, legacyPrompt = "LEGACY_ASSEMBLED_PROMPT") {
  const attempts = [];

  for (const generation of generationPlan) {
    const prompt = generation.scenePackage ?? legacyPrompt;
    attempts.push(buildReplicateImageInput(model, prompt, references));
  }

  return attempts;
}

test("social legacy flow creates two separate prediction attempts with the same assembled prompt", () => {
  const plan = createGenerationPlan(2, null);
  const attempts = runMockPredictions(NANO_BANANA_2_MODEL_ID, plan);

  assert.equal(plan.length, 2);
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts.map((input) => input.prompt), [
    "LEGACY_ASSEMBLED_PROMPT",
    "LEGACY_ASSEMBLED_PROMPT",
  ]);
});

test("HC flow selects the first two of four Hero Compositions and makes two attempts", () => {
  const heroCompositions = ["HC-001", "HC-002", "HC-003", "HC-004"];
  const plan = createGenerationPlan(2, heroCompositions);
  const attempts = runMockPredictions(GPT_IMAGE_MODEL_ID, plan);

  assert.deepEqual(plan.map((item) => item.scenePackage), ["HC-001", "HC-002"]);
  assert.equal(attempts.length, 2);
});

test("HC flow uses every Hero Composition when requested count matches availability", () => {
  const heroCompositions = ["HC-001", "HC-002", "HC-003", "HC-004"];
  const plan = createGenerationPlan(heroCompositions.length, heroCompositions);

  assert.deepEqual(plan.map((item) => item.scenePackage), heroCompositions);
  assert.equal(runMockPredictions(NANO_BANANA_2_MODEL_ID, plan).length, 4);
});

test("insufficient Hero Compositions fail before the first provider attempt", () => {
  let attempts = 0;

  assert.throws(
    () => {
      const plan = createGenerationPlan(3, ["HC-001", "HC-002"]);
      attempts += runMockPredictions(GPT_IMAGE_MODEL_ID, plan).length;
    },
    (error) => error instanceof GenerationCountConfigurationError,
  );
  assert.equal(attempts, 0);
});

test("duplicate atomic claim returns before plan creation or provider attempts", async () => {
  const adapter = await read("src/lib/ai/mvp-generation-adapter.ts");
  const claim = adapter.indexOf("claimPhotoshootGeneration(serviceClient");
  const duplicateReturn = adapter.indexOf("if (!claimed)", claim);
  const plan = adapter.indexOf("createGenerationPlan(", duplicateReturn);
  const prediction = adapter.indexOf("createPredictionWithRateLimit(replicate", plan);

  assert.ok(claim >= 0 && claim < duplicateReturn && duplicateReturn < plan && plan < prediction);
});

test("completion requires the exact number of unique internal S3 keys", () => {
  const photoshootId = "00000000-0000-4000-8000-000000000001";
  const first = `photoshoots/generations/${photoshootId}/result_1.jpg`;
  const second = `photoshoots/generations/${photoshootId}/result_2.jpg`;

  assert.equal(isExactInternalGenerationResultSet(photoshootId, [first, second], 2), true);
  assert.equal(isExactInternalGenerationResultSet(photoshootId, [first], 2), false);
  assert.equal(isExactInternalGenerationResultSet(photoshootId, [first, first], 2), false);
  assert.equal(
    isExactInternalGenerationResultSet(photoshootId, [first, "https://replicate.delivery/output.jpg"], 2),
    false,
  );
});

test("GPT Image and Nano Banana 2 share the same generation-count plan", () => {
  const plan = createGenerationPlan(2, ["HC-001", "HC-002", "HC-003", "HC-004"]);
  const gptAttempts = runMockPredictions(GPT_IMAGE_MODEL_ID, plan);
  const nanoAttempts = runMockPredictions(NANO_BANANA_2_MODEL_ID, plan);

  assert.equal(gptAttempts.length, 2);
  assert.equal(nanoAttempts.length, 2);
  assert.deepEqual(gptAttempts.map((input) => input.prompt), nanoAttempts.map((input) => input.prompt));
});

test("adapter and webhook use requested_images_count and forbid partial completion", async () => {
  const [adapter, webhook, statusRoute, statusHelper] = await Promise.all([
    read("src/lib/ai/mvp-generation-adapter.ts"),
    read("src/app/api/webhooks/replicate/generation/route.ts"),
    read("src/app/api/ai/status/[id]/route.ts"),
    read("src/lib/photoshoots/status.ts"),
  ]);

  assert.match(adapter, /getRequestedImageCount\(photoshoot\.requested_images_count\)/);
  assert.match(adapter, /for \(const \[generationIndex, generation\] of generationPlan\.entries\(\)\)/);
  assert.match(adapter, /outputUrls\.length !== 1/);
  assert.match(webhook, /requested_images_count/);
  assert.match(webhook, /newImages\.length === expectedCount/);
  assert.doesNotMatch(webhook, /getCompletedImagesThreshold|tolerated provider failure/);
  assert.match(statusRoute, /savedCount === expectedCount/);
  assert.doesNotMatch(statusRoute, /getRecoverableResultCount|recoveredFromPartialSet/);
  assert.match(statusHelper, /isExactInternalGenerationResultSet/);
});
