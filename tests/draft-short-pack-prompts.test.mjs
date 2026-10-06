import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getPhotoPackForHistory,
  photoPacks,
} from "../src/lib/photoPacks.ts";
import { catalogJtbdCollections } from "../src/lib/catalogJtbd.ts";
import {
  DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT,
  draftShortNanoPackDefinitions,
  getDraftShortNanoPackDefinition,
} from "../src/lib/ai/draft-short-pack-prompts.ts";

const FACEKEEP_PREFIX =
  "СТРОГО сохранить лицо и индивидуальность 1:1 — черты, пропорции, возраст, естественный цвет и длину волос. Загруженная фотография задаёт только лицо и индивидуальность. Одежду, укладку и макияж заменить по описанию текущего кадра.";

const expected = {
  flowers: {
    packageId: "SP-031",
    name: "Цветы",
    photoCount: 3,
    hashes: [
      "f48561476b55d7837dc7fcb1cd46b22e698c56898dcfb690446ca01495938b93",
      "a24fb199d697b3a9491fd5340cb62a47683214f5046c3ba7d3051ac20ea78714",
      "34a31f30ca393a5a95077670b5dca8ee49e4f9c06211821edf70903265ab0aa3",
    ],
    jtbdCollectionIds: ["events", "for-yourself", "social-lifestyle"],
  },
};

test("flowers is authored as one inactive three-frame draft", () => {
  assert.equal(DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT, 1);
  assert.equal(draftShortNanoPackDefinitions.length, 1);
  assert.equal(
    draftShortNanoPackDefinitions.reduce(
      (total, pack) => total + pack.heroCompositions.length,
      0,
    ),
    3,
  );

  const activeIds = new Set(photoPacks.flatMap(({ id, slug }) => [id, slug]));
  const draftIds = new Set();
  const draftSlugs = new Set();

  for (const [styleId, contract] of Object.entries(expected)) {
    const pack = getDraftShortNanoPackDefinition(styleId);
    assert.ok(pack);
    assert.equal(pack.packageId, contract.packageId);
    assert.equal(pack.styleId, styleId);
    assert.equal(pack.slug, styleId);
    assert.equal(pack.name, contract.name);
    assert.equal(pack.photoCount, contract.photoCount);
    assert.equal(pack.status, "draft");
    assert.equal(pack.catalogStatus, "inactive");
    assert.equal(pack.contractTag, "nb2-facekeep-v1.1");
    assert.equal(pack.formula, "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION");
    assert.equal(pack.provider, "google/nano-banana-2");
    assert.equal(pack.referenceCount, 1);
    assert.equal(pack.referencePolicy, "first-frontal-persona-photo");
    assert.equal(pack.resolution, "1K");
    assert.equal(pack.aspectRatio, "2:3");
    assert.equal(pack.outputFormat, "jpg");
    assert.equal(pack.previewModel, "Model B");
    assert.deepEqual(pack.jtbdCollectionIds, contract.jtbdCollectionIds);
    assert.equal(activeIds.has(pack.styleId), false);
    assert.equal(getPhotoPackForHistory(pack.styleId), undefined);
    assert.equal(draftIds.has(pack.packageId), false);
    assert.equal(draftSlugs.has(pack.slug), false);
    draftIds.add(pack.packageId);
    draftSlugs.add(pack.slug);

    const canonicalJtbdIds = new Set(
      catalogJtbdCollections.map(({ id }) => id),
    );
    for (const collectionId of pack.jtbdCollectionIds) {
      assert.equal(canonicalJtbdIds.has(collectionId), true);
    }

    assert.deepEqual(
      pack.heroCompositions.map(({ heroCompositionId }) => heroCompositionId),
      ["HC-001", "HC-002", "HC-003"],
    );

    for (const [index, hero] of pack.heroCompositions.entries()) {
      const hash = createHash("sha256").update(hero.prompt, "utf8").digest("hex");
      assert.equal(hash, contract.hashes[index]);
      assert.equal(hero.prompt.startsWith(FACEKEEP_PREFIX), true);
      assert.match(hero.prompt, /полуулыб|улыбк/i);
      assert.match(hero.prompt, /белая рубашка/i);
      assert.match(hero.prompt, /нежно-розов(?:ых|ые) пион/i);
      assert.doesNotMatch(hero.prompt, /груст|задумчив|безэмоцион/i);
    }
  }
});

test("draft packs cannot be ordered and are not wired into the production adapter", async () => {
  const orderableIds = new Set(photoPacks.map(({ id }) => id));
  for (const pack of draftShortNanoPackDefinitions) {
    assert.equal(orderableIds.has(pack.styleId), false);
  }

  const adapterSource = await readFile(
    new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(adapterSource, /draft-short-pack-prompts/);
});
