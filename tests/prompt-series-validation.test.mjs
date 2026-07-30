import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SERIES_VARIABLE_HAIR_LOCK_PATTERNS,
  normalizeSeriesVariableTraits,
  validatePromptSource,
} from "../src/lib/ai/prompt-system-quality.ts";

const source = await readFile(
  new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url),
  "utf8",
);

const productionLockFixtures = [
  "the same long loose hair across all four images",
  "Keep the same hairstyle across all Hero Compositions",
  "same loose wavy hair",
  "the same professional luxury blowout across all four images",
  "the same soft large loose curls across all four images",
  "Hairstyle is locked for the entire photoshoot and must look professionally styled.",
  "same hairstyle arrangement across the series",
  "consistent hairstyle arrangement across all Hero Compositions",
  "locked hairstyle arrangement across all four images",
  "keep the same parting across the series",
  "maintain the same curls across all four images",
  "use the same waves across all Hero Compositions",
  "keep the same blowout across the series",
  "maintain the same loose hair placement across all four images",
  "use the same strand placement across the series",
  "strands are locked across the series.",
  "same hairstyle",
  "same wet-look hairstyle",
  "same loose wavy wind-touched hair",
  "same professional salon blowout",
  "same soft polished waves",
  "same soft loose waves",
  "no change of hairstyle between Hero Compositions",
  "no changed hairstyle",
  "Hairstyle is a locked appearance element for the entire photoshoot.",
  "same hair arrangement",
  "same hair volume, same texture and same hair arrangement",
  "do not change hairstyle, hair volume or hair arrangement",
  "consistent polished waves across the series",
  "dress, hairstyle, makeup",
  "same head angle",
];

test("every declared series lock pattern is covered by a fixture", () => {
  for (const { name, pattern } of SERIES_VARIABLE_HAIR_LOCK_PATTERNS) {
    assert.ok(productionLockFixtures.some((fixture) => pattern.test(fixture)), `missing fixture for: ${name}`);
  }
});

test("confirmed production hairstyle locks normalize to stable natural traits", () => {
  for (const fixture of productionLockFixtures) {
    const rawIssues = validatePromptSource({
      packageId: "FIXTURE",
      heroCompositionId: "SERIES",
      seriesPrompt: fixture,
      heroPrompt: "portrait",
    });
    assert.ok(rawIssues.some((issue) => issue.code === "SERIES_LOCKS_VARIABLE_HAIR_OR_HEAD"), fixture);

    const normalized = normalizeSeriesVariableTraits(fixture);
    assert.match(normalized, /natural hair color, length and texture/i, fixture);
    assert.deepEqual(validatePromptSource({
      packageId: "FIXTURE",
      heroCompositionId: "SERIES",
      seriesPrompt: normalized,
      heroPrompt: "portrait",
    }), [], fixture);
  }
});

test("all normalized production series blocks release variable hair and head traits", () => {
  const issues = [];
  let checked = 0;

  for (const match of source.matchAll(/const (SP\d+)_SERIES_(?:APPEARANCE|CONTINUITY) = \[([\s\S]*?)\]\.join\(" "\);/g)) {
    checked += 1;
    issues.push(...validatePromptSource({
      packageId: match[1],
      heroCompositionId: "SERIES",
      seriesPrompt: normalizeSeriesVariableTraits(match[2]),
      heroPrompt: "portrait",
    }));
  }

  assert.equal(checked, 14);
  assert.deepEqual(issues, []);
});
