import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { photoPacks } from "../src/lib/photoPacks.ts";
import {
  DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT,
  draftShortNanoPackDefinitions,
  getDraftShortNanoPackDefinition,
} from "../src/lib/ai/draft-short-pack-prompts.ts";

const expected = {


};

test("no approved reference series remain authored as inactive drafts", () => {
  assert.equal(DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT, 1);
  assert.equal(draftShortNanoPackDefinitions.length, 0);
  assert.equal(
    draftShortNanoPackDefinitions.reduce(
      (total, pack) => total + pack.heroCompositions.length,
      0,
    ),
    0,
  );

  for (const [styleId, contract] of Object.entries(expected)) {
    const pack = getDraftShortNanoPackDefinition(styleId);
    assert.ok(pack);
    assert.equal(pack.packageId, contract.packageId);
    assert.equal(pack.name, contract.name);
    assert.equal(pack.status, "draft");
    assert.equal(pack.catalogStatus, "inactive");
    assert.equal(pack.formula, "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION");
    assert.deepEqual(
      pack.heroCompositions.map(({ heroCompositionId }) => heroCompositionId),
      contract.hashes.map(
        (_hash, index) => `HC-${String(index + 1).padStart(3, "0")}`,
      ),
    );

    for (const [index, hero] of pack.heroCompositions.entries()) {
      const hash = createHash("sha256").update(hero.prompt, "utf8").digest("hex");
      assert.equal(hash, contract.hashes[index]);
      assert.match(hero.prompt, /^СТРОГО сохранить лицо и индивидуальность 1:1/);
      assert.match(hero.prompt, /полуулыб|улыбк|смех|смеёт/i);
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

