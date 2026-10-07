import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { catalogJtbdCollections } from "../src/lib/catalogJtbd.ts";
import { getShortNanoPackDefinition } from "../src/lib/ai/short-pack-prompts.ts";
import { photoPacks } from "../src/lib/photoPacks.ts";

const previews = [
  "/package-previews/sp032-birthday-projection-model-b-hc001.jpg",
  "/package-previews/sp032-birthday-projection-model-b-hc002.jpg",
];

test("SP-032 is an active two-frame production pack", () => {
  const pack = photoPacks.find(({ id }) => id === "birthday-projection");
  assert.ok(pack);
  assert.equal(pack.photoCount, 2);
  assert.equal(pack.priceRub, 99);
  assert.equal(pack.priceCrystals, 20);
  assert.equal(pack.image, previews[0]);
  assert.deepEqual(pack.gallery, previews);
  assert.equal(pack.gallery.length, 2);
  for (const preview of previews) {
    assert.equal(existsSync(new URL(`../public${preview}`, import.meta.url)), true);
  }
});

test("SP-032 uses exactly the two approved production prompts", () => {
  const definition = getShortNanoPackDefinition("birthday-projection");
  assert.ok(definition);
  assert.equal(definition.packageId, "SP-032");
  assert.equal(definition.formula, "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION");
  assert.deepEqual(definition.heroCompositions.map(({ heroCompositionId }) => heroCompositionId), ["HC-001", "HC-002"]);
  assert.equal(definition.heroCompositions.length, 2);
  assert.deepEqual(
    definition.heroCompositions.map(({ promptSha256 }) => promptSha256),
    [
      "57d2384f483b5ce90f61187fe5bb0e0ae7c85c6f4a1ddf584309c3ac7ab0444b",
      "5a63cd0a13de215ee34daef8dd76053ac4734684f603a8b95903461c2ab5c2cb",
    ],
  );
});

test("SP-032 appears only in the approved events JTBD collection", () => {
  const containing = catalogJtbdCollections
    .filter(({ cardIds }) => cardIds.includes("birthday-projection"))
    .map(({ id }) => id);
  assert.deepEqual(containing, ["events"]);
});
