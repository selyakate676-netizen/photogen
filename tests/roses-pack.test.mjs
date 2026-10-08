import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { catalogJtbdCollections } from "../src/lib/catalogJtbd.ts";
import { getShortNanoPackDefinition } from "../src/lib/ai/short-pack-prompts.ts";
import { photoPacks } from "../src/lib/photoPacks.ts";

const previews = [
  "/package-previews/sp034-roses-model-c-hc001.jpg",
  "/package-previews/sp034-roses-model-c-hc002.jpg",
];

test("SP-034 is an active two-frame production pack", () => {
  const pack = photoPacks.find(({ id }) => id === "roses");
  assert.ok(pack);
  assert.equal(pack.photoCount, 2);
  assert.equal(pack.priceRub, 99);
  assert.equal(pack.priceCrystals, 20);
  assert.equal(pack.image, previews[0]);
  assert.deepEqual(pack.gallery, previews);
  for (const preview of previews) assert.equal(existsSync(new URL(`../public${preview}`, import.meta.url)), true);
});

test("SP-034 uses exactly two short-anchor production prompts", () => {
  const definition = getShortNanoPackDefinition("roses");
  assert.ok(definition);
  assert.equal(definition.packageId, "SP-034");
  assert.equal(definition.formula, "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION");
  assert.deepEqual(definition.heroCompositions.map(({ heroCompositionId }) => heroCompositionId), ["HC-001", "HC-002"]);
});

test("SP-034 appears only in events", () => {
  const containing = catalogJtbdCollections.filter(({ cardIds }) => cardIds.includes("roses")).map(({ id }) => id);
  assert.deepEqual(containing, ["events"]);
});