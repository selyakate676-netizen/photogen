import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { catalogJtbdCollections } from "../src/lib/catalogJtbd.ts";
import { getShortNanoPackDefinition } from "../src/lib/ai/short-pack-prompts.ts";
import { photoPacks } from "../src/lib/photoPacks.ts";

const previews = [
  "/package-previews/sp033-glamour-look-model-a-hc001.jpg",
  "/package-previews/sp033-glamour-look-model-a-hc002.jpg",
];

test("SP-033 is an active two-frame production pack", () => {
  const pack = photoPacks.find(({ id }) => id === "glamour-look");
  assert.ok(pack);
  assert.equal(pack.title, "Гламурный образ");
  assert.equal(pack.photoCount, 2);
  assert.equal(pack.priceRub, 99);
  assert.equal(pack.priceCrystals, 20);
  assert.equal(pack.image, previews[0]);
  assert.deepEqual(pack.gallery, previews);
  for (const preview of previews) {
    assert.equal(existsSync(new URL(`../public${preview}`, import.meta.url)), true);
  }
});

test("SP-033 uses only the approved glass and lipstick compositions", () => {
  const definition = getShortNanoPackDefinition("glamour-look");
  assert.ok(definition);
  assert.equal(definition.packageId, "SP-033");
  assert.equal(definition.formula, "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION");
  assert.deepEqual(definition.heroCompositions.map(({ heroCompositionId }) => heroCompositionId), ["HC-001", "HC-002"]);
  assert.deepEqual(definition.heroCompositions.map(({ name }) => name), ["Glamour Restaurant Portrait", "Mirror Lipstick Portrait"]);
  assert.deepEqual(definition.heroCompositions.map(({ promptSha256 }) => promptSha256), [
    "1b7ff1d6352bd7ece930754905fd3a6b83d1e06d5c1226ff91317be140bcb2c4",
    "621dd54bc2c10b0622e94af56cd6659f3f489180133ea4b0dd2a1e7076ffe001",
  ]);
});

test("SP-033 appears in exactly the four approved JTBD collections", () => {
  const containing = catalogJtbdCollections
    .filter(({ cardIds }) => cardIds.includes("glamour-look"))
    .map(({ id }) => id);
  assert.deepEqual(containing, ["social-lifestyle", "dating", "events", "for-yourself"]);
});