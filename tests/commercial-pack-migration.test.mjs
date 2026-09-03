import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getPhotoPack,
  getPhotoPackForHistory,
  photoPacks,
} from "../src/lib/photoPacks.ts";
import {
  SHORT_NANO_PACK_REFERENCE_COUNT,
  getShortNanoPackDefinition,
  shortNanoPackDefinitions,
} from "../src/lib/ai/short-pack-prompts.ts";

const expectedPromptHashes = {
  "autumn-promenade": [
    "0e18a44ee035f76630cf63f525c27b76a8d269a7c8073aa1bdb88b780489c07f",
    "6306e52683af57a2130f1b893c42637e99cbd0507c5cd8d72cf4b48ee4365ed7",
    "280a780734b17ed42b31ca21d46239c41d1ee89d6aa6aa25239122a26be45b5f",
    "1557b6fa6b1d1f8ebb5b60bcae495c1a857a8ac1a6bf9f10d22a1efc18bac5df",
  ],
  "misty-morning": [
    "989195b1122c55d617dd5fc320a4b30f7826efe462c692a4e398a77e2d1de3db",
    "6039a305a6f71655da20aa8d53b22a17acd4a18af4cbac09b540547fbdadb705",
    "95ec8500cf403cb8b3703d35b723b84717a118f82f1ac00493a7cac0f307c819",
    "a5832a2db800c77d1f34907a042dc15caa0ad5669cf229b7a00eac1ffd96c8ca",
  ],
  "golden-field": [
    "43179924cc35f157ad29f048aea2928c44f41e20ce959de72a37964a70ad9b21",
    "ef0d26934e817221ca2cf5a3f69c2b57b6760bef93ddcd8d8b39749242b28ee6",
    "7d4c46ca71aca939448e3743ed366d2d4a6a0cd7885b0c20f529bd601f946155",
    "942abfcc67d010d6970abf8fffa91d4ba3f1336622a6bc239047bf92d631cdb4",
  ],
};

test("only the three accepted Model A packs are orderable", () => {
  assert.deepEqual(
    photoPacks.map((pack) => pack.id),
    ["autumn-promenade", "misty-morning", "golden-field"],
  );

  for (const pack of photoPacks) {
    assert.equal(pack.photoCount, 4);
    assert.equal(pack.gallery.length, 4);
    assert.ok(pack.gallery.every((path) => path.includes("-model-a-hc00")));
    assert.equal(pack.image, pack.gallery[0]);
  }
});

test("legacy packs are hidden from ordering but remain resolvable for history", () => {
  assert.equal(getPhotoPack("dating"), undefined);
  assert.equal(getPhotoPack("studio"), undefined);
  assert.equal(getPhotoPack("neon"), undefined);
  assert.equal(getPhotoPackForHistory("dating")?.id, "dating");
  assert.equal(getPhotoPackForHistory("studio")?.id, "studio");
  assert.equal(getPhotoPackForHistory("neon")?.id, "neon");
});

test("short Nano packs preserve all twelve approved prompts byte-for-byte", () => {
  assert.equal(SHORT_NANO_PACK_REFERENCE_COUNT, 1);
  assert.equal(shortNanoPackDefinitions.length, 3);

  for (const [styleId, hashes] of Object.entries(expectedPromptHashes)) {
    const pack = getShortNanoPackDefinition(styleId);
    assert.ok(pack);
    assert.equal(pack.heroCompositions.length, 4);
    assert.deepEqual(
      pack.heroCompositions.map(({ heroCompositionId }) => heroCompositionId),
      ["HC-001", "HC-002", "HC-003", "HC-004"],
    );

    for (const [index, hero] of pack.heroCompositions.entries()) {
      const actual = createHash("sha256").update(hero.prompt, "utf8").digest("hex");
      assert.equal(actual, hashes[index]);
      assert.equal(hero.promptSha256, hashes[index]);
    }
  }
});

test("adapter gives new packs an isolated one-reference Nano path", async () => {
  const source = await readFile(
    new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /isShortNanoPack \? NANO_BANANA_2_MODEL_ID : getAiGenerationModel\(\)/);
  assert.match(source, /isShortNanoPack \? SHORT_NANO_PACK_REFERENCE_COUNT : options\.referenceCount/);
  assert.match(source, /isShortNanoPack\s*\? generation\.scenePackage\s*:\s*buildMvpPromptWithScenePackage/);
  assert.match(source, /const shortNanoPackPrompts = getShortNanoPackPrompts\(photoshoot\.style_id\)/);
  assert.ok(
    source.indexOf("if (isShortNanoPackStyle(photoshoot.style_id)) return true;")
      < source.indexOf("if (options.scenePrompt) return false;"),
    "saved short-pack prompts must win over request-time scenePrompt overrides",
  );
});

test("catalog contains no placeholder or archived cards", async () => {
  const source = await readFile(
    new URL("../src/components/CatalogSection.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /placeholderCards/);
  assert.match(source, /const catalogCards = realCards/);
  assert.match(source, /autumn-promenade/);
  assert.match(source, /misty-morning/);
  assert.match(source, /golden-field/);
});
