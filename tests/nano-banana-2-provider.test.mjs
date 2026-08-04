import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_AI_GENERATION_MODEL,
  GPT_IMAGE_MODEL_ID,
  MAX_PROVIDER_IMAGE_BYTES,
  NANO_BANANA_2_MODEL_ID,
  ProviderOutputError,
  buildReplicateImageInput,
  downloadReplicateImage,
  normalizeReplicateOutputUrls,
  resolveAiGenerationModel,
} from "../src/lib/ai/image-generation-provider.ts";
import { selectPersonaReferenceKeys } from "../src/lib/ai/persona-reference-policy.ts";

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
const outputUrl = "https://replicate.delivery/pbxt/test/output.jpg";

test("GPT Image remains the default model when AI_GENERATION_MODEL is absent or blank", () => {
  assert.equal(DEFAULT_AI_GENERATION_MODEL, GPT_IMAGE_MODEL_ID);
  assert.equal(resolveAiGenerationModel(undefined), GPT_IMAGE_MODEL_ID);
  assert.equal(resolveAiGenerationModel("  "), GPT_IMAGE_MODEL_ID);
});

test("AI_GENERATION_MODEL explicitly selects Nano Banana 2", () => {
  assert.equal(resolveAiGenerationModel(NANO_BANANA_2_MODEL_ID), NANO_BANANA_2_MODEL_ID);
});

test("unknown AI_GENERATION_MODEL values fail closed", () => {
  assert.throws(
    () => resolveAiGenerationModel("google/unknown-model"),
    /Unsupported AI_GENERATION_MODEL/,
  );
});

test("Nano Banana 2 uses the frozen official model identifier", () => {
  assert.equal(NANO_BANANA_2_MODEL_ID, "google/nano-banana-2");
});

test("Nano Banana 2 input preserves the assembled prompt verbatim", () => {
  const prompt = "GENERATION_TASK\n\nIDENTITY\n\nCURRENT_HERO_COMPOSITION";
  const input = buildReplicateImageInput(NANO_BANANA_2_MODEL_ID, prompt, ["ref-a", "ref-b"]);

  assert.equal(input.prompt, prompt);
});

test("Nano Banana 2 receives exactly the first two unique Persona references in source order", () => {
  const selected = selectPersonaReferenceKeys(["ref-a", "ref-a", "ref-b", "ref-c"]);
  const input = buildReplicateImageInput(NANO_BANANA_2_MODEL_ID, "prompt", selected);

  assert.deepEqual(input.image_input, ["ref-a", "ref-b"]);
});

test("Nano Banana 2 payload matches the supported production contract", () => {
  const input = buildReplicateImageInput(NANO_BANANA_2_MODEL_ID, "prompt", ["ref-a", "ref-b"]);

  assert.deepEqual(input, {
    prompt: "prompt",
    image_input: ["ref-a", "ref-b"],
    resolution: "1K",
    aspect_ratio: "2:3",
    output_format: "jpg",
  });
  assert.equal("image_search" in input, false);
  assert.equal("google_search" in input, false);
  assert.equal("quality" in input, false);
  assert.equal("number_of_images" in input, false);
  assert.equal("output_compression" in input, false);
});

test("GPT Image payload remains byte-for-field compatible with the existing adapter contract", () => {
  assert.deepEqual(buildReplicateImageInput(GPT_IMAGE_MODEL_ID, "prompt", ["ref-a", "ref-b"]), {
    prompt: "prompt",
    input_images: ["ref-a", "ref-b"],
    aspect_ratio: "2:3",
    quality: "high",
    output_format: "jpeg",
    number_of_images: 1,
    output_compression: 95,
  });
});

test("Nano Banana 2 URI output is normalized to the shared URL list contract", () => {
  assert.deepEqual(normalizeReplicateOutputUrls(outputUrl), [outputUrl]);
  assert.deepEqual(normalizeReplicateOutputUrls([outputUrl]), [outputUrl]);
  assert.deepEqual(normalizeReplicateOutputUrls({ url: outputUrl }), [outputUrl]);
});

test("malformed or untrusted provider output URIs are rejected", () => {
  for (const output of [
    "not-a-url",
    "http://replicate.delivery/output.jpg",
    "https://example.com/output.jpg",
    ["https://replicate.delivery/output.jpg", { bad: true }],
  ]) {
    assert.throws(
      () => normalizeReplicateOutputUrls(output),
      (error) => error instanceof ProviderOutputError,
    );
  }
});

test("provider output download is server-side, bounded and content-type checked", async () => {
  const requested = [];
  const result = await downloadReplicateImage(outputUrl, async (url) => {
    requested.push(url);
    return new Response(Buffer.from("jpeg-data"), {
      status: 200,
      headers: { "content-type": "image/jpeg", "content-length": "9" },
    });
  });

  assert.deepEqual(requested, [outputUrl]);
  assert.equal(result.contentType, "image/jpeg");
  assert.equal(result.buffer.toString(), "jpeg-data");
});

test("provider output download rejects HTTP, type, size and empty-body failures", async () => {
  await assert.rejects(
    downloadReplicateImage(outputUrl, async () => new Response("no", { status: 502 })),
    /PROVIDER_OUTPUT_DOWNLOAD_FAILED/,
  );
  await assert.rejects(
    downloadReplicateImage(
      outputUrl,
      async () => new Response("html", { headers: { "content-type": "text/html" } }),
    ),
    /INVALID_PROVIDER_OUTPUT_TYPE/,
  );
  await assert.rejects(
    downloadReplicateImage(
      outputUrl,
      async () =>
        new Response("x", {
          headers: {
            "content-type": "image/jpeg",
            "content-length": String(MAX_PROVIDER_IMAGE_BYTES + 1),
          },
        }),
    ),
    /PROVIDER_OUTPUT_TOO_LARGE/,
  );
  await assert.rejects(
    downloadReplicateImage(
      outputUrl,
      async () => new Response(new Uint8Array(), { headers: { "content-type": "image/jpeg" } }),
    ),
    /EMPTY_PROVIDER_OUTPUT/,
  );
});

test("adapter selects the model only on the server and keeps claim before prediction creation", async () => {
  const [adapter, env] = await Promise.all([
    read("src/lib/ai/mvp-generation-adapter.ts"),
    read("src/lib/env.ts"),
  ]);
  const claim = adapter.indexOf("claimPhotoshootGeneration(serviceClient");
  const modelSelection = adapter.indexOf("getAiGenerationModel()", claim);
  const prediction = adapter.indexOf("createPredictionWithRateLimit(replicate", modelSelection);

  assert.ok(claim >= 0 && claim < modelSelection && modelSelection < prediction);
  assert.match(adapter, /generationModel === GPT_IMAGE_MODEL_ID/);
  assert.match(adapter, /\? \{ version: await getLatestModelVersion\(GPT_IMAGE_MODEL_ID\) \}/);
  assert.match(adapter, /: \{ model: generationModel \}/);
  assert.match(env, /getOptionalEnv\("AI_GENERATION_MODEL", DEFAULT_AI_GENERATION_MODEL\)/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_AI_GENERATION/);
});

test("adapter preserves ownership, generation_id and one-prediction-per-HC contracts", async () => {
  const adapter = await read("src/lib/ai/mvp-generation-adapter.ts");
  const ownerFilter = adapter.indexOf('.eq("user_id", ownerId)');
  const generationPlan = adapter.indexOf("createGenerationPlan(");
  const generationLoop = adapter.indexOf("for (const [generationIndex, generation] of generationPlan.entries())");
  const heroPrediction = adapter.indexOf("createPredictionWithRateLimit(replicate", generationLoop);
  const generationIdWrite = adapter.indexOf(".update({ generation_id: predictionIds.join", heroPrediction);

  assert.ok(ownerFilter >= 0 && ownerFilter < heroPrediction);
  assert.ok(generationPlan >= 0 && generationPlan < generationLoop);
  assert.ok(generationLoop < heroPrediction && heroPrediction < generationIdWrite);
  assert.match(adapter, /selectPersonaReferenceKeys\(personaReferenceKeys, options\.referenceCount\)/);
  assert.match(adapter, /buildMvpPromptWithScenePackage\(photoshoot, generation\.scenePackage\)/);
  assert.match(adapter, /buildReplicateImageInput\(generationModel, finalPrompt, referenceUrls\)/);
});

test("webhook validates prediction association and ignores repeated or terminal delivery", async () => {
  const webhook = await read("src/app/api/webhooks/replicate/generation/route.ts");

  assert.match(webhook, /getGenerationIds\(currentShoot\.generation_id\)\.includes\(payload\.id\)/);
  assert.match(webhook, /Ignored unassociated prediction/);
  assert.match(webhook, /Terminal photoshoot status already recorded/);
  assert.match(webhook, /Prediction output already recorded/);
  assert.match(webhook, /result_\$\{stablePredictionKey\}_/);
});

test("webhook saves a validated private S3 key before recording completed status", async () => {
  const [webhook, status] = await Promise.all([
    read("src/app/api/webhooks/replicate/generation/route.ts"),
    read("src/lib/photoshoots/status.ts"),
  ]);
  const download = webhook.indexOf("downloadReplicateImage(images[i])");
  const s3Write = webhook.indexOf("await s3Client.send", download);
  const statusWrite = webhook.indexOf("updatePhotoshootGenerationStatus(supabase, photoshootId, nextStatus, newImages)", s3Write);

  assert.ok(download >= 0 && download < s3Write && s3Write < statusWrite);
  assert.match(webhook, /savedS3Keys\.push\(s3Key\)/);
  assert.doesNotMatch(webhook, /result_images[^\n]*images\[i\]/);
  assert.match(status, /record_photoshoot_result_images/);
});

test("malformed output and persistence failures use the existing safe failed lifecycle", async () => {
  const webhook = await read("src/app/api/webhooks/replicate/generation/route.ts");

  assert.match(webhook, /Invalid provider output[\s\S]*?updatePhotoshootGenerationStatus\(supabase, photoshootId, "failed"\)/);
  assert.match(webhook, /Output persistence failed[\s\S]*?updatePhotoshootGenerationStatus\(supabase, photoshootId, "failed"\)/);
  assert.doesNotMatch(webhook, /console\.(?:log|error)\([^\n]*imageUrl/);
});

test("provider credentials and selection cannot enter a client-facing contract", async () => {
  const [env, adapter, route] = await Promise.all([
    read("src/lib/env.ts"),
    read("src/lib/ai/mvp-generation-adapter.ts"),
    read("src/app/api/ai/mvp-generate/route.ts"),
  ]);

  assert.match(env, /getReplicateApiToken\(\)/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_REPLICATE|NEXT_PUBLIC_AI_GENERATION_MODEL/);
  assert.doesNotMatch(route, /AI_GENERATION_MODEL|provider|model/i);
  assert.doesNotMatch(adapter, /console\.[^(]+\([^)]*referenceUrls/);
});
