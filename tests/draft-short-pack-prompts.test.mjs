import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { photoPacks } from "../src/lib/photoPacks.ts";
import { catalogJtbdCollections } from "../src/lib/catalogJtbd.ts";
import {
  DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT,
  draftShortNanoPackDefinitions,
  getDraftShortNanoPackDefinition,
} from "../src/lib/ai/draft-short-pack-prompts.ts";

const FACEKEEP =
  "СТРОГО сохранить лицо и индивидуальность 1:1 — черты, пропорции, возраст, естественный цвет и длину волос. Загруженная фотография задаёт только лицо и индивидуальность. Одежду, укладку и макияж заменить по описанию текущего кадра.";

const expected = [
  {
    id: "SP-032",
    slug: "birthday-projection",
    name: "День рождения с проекцией",
    photoCount: 2,
    jtbd: ["events", "for-yourself", "social-lifestyle"],
  },
];

test("SP-032 remains an isolated inactive Model B draft", () => {
  assert.equal(DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT, 1);
  assert.equal(draftShortNanoPackDefinitions.length, 1);

  const activeIds = new Set(photoPacks.flatMap(({ id, slug }) => [id, slug]));
  const canonicalJtbdIds = new Set(catalogJtbdCollections.map(({ id }) => id));

  for (const contract of expected) {
    const pack = getDraftShortNanoPackDefinition(contract.slug);
    assert.ok(pack);
    assert.equal(pack.packageId, contract.id);
    assert.equal(pack.name, contract.name);
    assert.equal(pack.photoCount, contract.photoCount);
    assert.equal(pack.heroCompositions.length, contract.photoCount);
    assert.equal(pack.status, "draft");
    assert.equal(pack.catalogStatus, "inactive");
    assert.equal(pack.previewModel, "Model B");
    assert.equal(pack.previewSource, "/marketing/hero/group-2/source.png");
    assert.equal(pack.referencePolicy, "synthetic-model-b");
    assert.equal(pack.referenceCount, 1);
    assert.equal(pack.provider, "google/nano-banana-2");
    assert.equal(pack.formula, "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION");
    assert.equal(pack.resolution, "1K");
    assert.equal(pack.aspectRatio, "2:3");
    assert.equal(pack.outputFormat, "jpg");
    assert.deepEqual(pack.jtbdCollectionIds, contract.jtbd);
    assert.equal(activeIds.has(pack.packageId), false);
    assert.equal(activeIds.has(pack.slug), false);

    for (const collectionId of pack.jtbdCollectionIds) {
      assert.equal(canonicalJtbdIds.has(collectionId), true);
    }

    for (const hero of pack.heroCompositions) {
      assert.equal(hero.prompt.startsWith(`${FACEKEEP}\n\n`), true);
      assert.doesNotMatch(hero.prompt, /REALISM|anatomy overlay|body overlay/i);
    }
  }
});

test("SP-032 is not wired into runtime generation or catalog", async () => {
  const adapterSource = await readFile(
    new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url),
    "utf8",
  );
  const catalogSource = await readFile(
    new URL("../src/lib/photoPacks.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(adapterSource, /draft-short-pack-prompts/);
  assert.doesNotMatch(catalogSource, /birthday-projection|new-year-evening/);
});
