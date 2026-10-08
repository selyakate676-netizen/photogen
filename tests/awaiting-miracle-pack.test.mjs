import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { catalogJtbdCollections } from "../src/lib/catalogJtbd.ts";
import { getShortNanoPackDefinition } from "../src/lib/ai/short-pack-prompts.ts";
import { photoPacks } from "../src/lib/photoPacks.ts";

const previews = [
  "/package-previews/sp035-awaiting-miracle-model-b-hc001.jpg",
  "/package-previews/sp035-awaiting-miracle-model-b-hc002.jpg",
];

test("SP-035 is an active two-frame production pack", () => {
  const pack = photoPacks.find(({ id }) => id === "awaiting-miracle");
  assert.ok(pack);
  assert.equal(pack.title, "В ожидании чуда");
  assert.equal(pack.photoCount, 2);
  assert.equal(pack.priceRub, 99);
  assert.equal(pack.priceCrystals, 20);
  assert.equal(pack.image, previews[0]);
  assert.deepEqual(pack.gallery, previews);
  for (const preview of previews) assert.equal(existsSync(new URL(`../public${preview}`, import.meta.url)), true);
});

test("SP-035 uses exactly two canonical short-anchor prompts", () => {
  const definition = getShortNanoPackDefinition("awaiting-miracle");
  assert.ok(definition);
  assert.equal(definition.packageId, "SP-035");
  assert.equal(definition.formula, "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION");
  assert.deepEqual(definition.heroCompositions.map(({ heroCompositionId }) => heroCompositionId), ["HC-001", "HC-002"]);
  assert.equal(definition.heroCompositions.length, 2);
});

test("SP-034 remains outside the production catalog", () => {
  assert.equal(photoPacks.some(({ id }) => id === "roses"), false);
  assert.equal(getShortNanoPackDefinition("roses"), undefined);
});

test("SP-035 appears only in the family JTBD collection", () => {
  const containing = catalogJtbdCollections.filter(({ cardIds }) => cardIds.includes("awaiting-miracle")).map(({ id }) => id);
  assert.deepEqual(containing, ["family"]);
});
