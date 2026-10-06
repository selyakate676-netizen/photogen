import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { catalogJtbdCollections } from "../src/lib/catalogJtbd.ts";
import { getShortNanoPackDefinition } from "../src/lib/ai/short-pack-prompts.ts";
import { photoPacks } from "../src/lib/photoPacks.ts";

const previewPaths = [
  "/package-previews/sp031-flowers-model-b-hc001.jpg",
  "/package-previews/sp031-flowers-model-b-hc002.jpg",
  "/package-previews/sp031-flowers-model-b-hc003.jpg",
];

test("SP-031 flowers is an active three-frame catalog pack", () => {
  const pack = photoPacks.find(({ id }) => id === "flowers");
  assert.ok(pack);
  assert.equal(pack.photoCount, 3);
  assert.equal(pack.priceRub, 139);
  assert.equal(pack.priceCrystals, 28);
  assert.equal(pack.image, previewPaths[0]);
  assert.deepEqual(pack.gallery, previewPaths);

  for (const imagePath of previewPaths) {
    assert.equal(existsSync(new URL(`../public${imagePath}`, import.meta.url)), true);
  }
});

test("SP-031 flowers uses the approved canonical prompts", () => {
  const prompts = getShortNanoPackDefinition("flowers");
  assert.ok(prompts);
  assert.equal(prompts.packageId, "SP-031");
  assert.equal(prompts.formula, "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION");
  assert.deepEqual(
    prompts.heroCompositions.map(({ heroCompositionId }) => heroCompositionId),
    ["HC-001", "HC-002", "HC-003"],
  );
  assert.equal(prompts.heroCompositions.every(({ promptSha256 }) => /^[a-f0-9]{64}$/.test(promptSha256)), true);
});

test("flowers appears in the approved JTBD collections", () => {
  const byId = new Map(catalogJtbdCollections.map((collection) => [collection.id, collection]));
  for (const collectionId of ["events", "for-yourself", "social-lifestyle"]) {
    assert.equal(byId.get(collectionId)?.cardIds.includes("flowers"), true);
  }
});
