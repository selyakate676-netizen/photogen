import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CURRENT_HERO_COMPOSITION_MARKER,
  IDENTITY_AND_COMPOSITION_CONTRACT,
  SERIES_VARIABLE_HAIR_LOCK_PATTERNS,
  getPoseAnatomySafety,
  normalizeSeriesVariableTraits,
  splitSceneAndHeroPrompt,
  validatePromptSource,
} from "../src/lib/ai/prompt-system-quality.ts";

const source = await readFile(
  new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url),
  "utf8",
);

test("all production Hero Compositions pass deterministic source validation", () => {
  const functionMatches = [...source.matchAll(/function getSp(\d+)HeroScenePackages\(\): string\[\] \{/g)];
  const checked = [];
  const issues = [];

  for (const [index, match] of functionMatches.entries()) {
    const sectionStart = match.index ?? 0;
    const sectionEnd = functionMatches[index + 1]?.index ?? source.indexOf("function getHeroScenePackagesForPhotoshoot");
    const section = source.slice(sectionStart, sectionEnd);
    const packageId = `SP-${match[1]}`;

    for (const heroMatch of section.matchAll(/promptText:\s*\r?\n?\s*"([^"]+)"/g)) {
      const heroPrompt = heroMatch[1];
      const heroCompositionId = heroPrompt.match(/HC-\d+/)?.[0] ?? "UNKNOWN";
      checked.push(`${packageId}/${heroCompositionId}`);
      issues.push(...validatePromptSource({
        packageId,
        heroCompositionId,
        seriesPrompt: "",
        heroPrompt,
      }));
    }
  }

  assert.equal(checked.length, 28);
  assert.deepEqual(issues, []);
});

test("production series text is normalized away from variable hair and head locks", () => {
  const seriesBlocks = [...source.matchAll(/const SP\d+_SERIES_(?:APPEARANCE|CONTINUITY) = \[([\s\S]*?)\]\.join\(" "\);/g)];
  assert.ok(seriesBlocks.length >= 12);

  for (const block of seriesBlocks) {
    const normalized = normalizeSeriesVariableTraits(block[1]);
    assert.doesNotMatch(normalized, /same hairstyle|changed hairstyle|same hair arrangement|same head angle/i);
  }
});


test("all assembled production final prompts release cross-frame hairstyle locks", () => {
  const heroPrompts = [...source.matchAll(/promptText:\s*\r?\n?\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(heroPrompts.length, 28);

  for (const heroPrompt of heroPrompts) {
    const split = splitSceneAndHeroPrompt(
      `natural hair color, natural hair length and natural hair texture ${CURRENT_HERO_COMPOSITION_MARKER} ${heroPrompt}`,
    );
    const anatomy = getPoseAnatomySafety(split.heroComposition ?? "");
    const finalPrompt = [
      IDENTITY_AND_COMPOSITION_CONTRACT,
      split.seriesAndScene,
      split.heroComposition,
      anatomy,
    ].filter(Boolean).join("\n\n");

    for (const { pattern } of SERIES_VARIABLE_HAIR_LOCK_PATTERNS) {
      assert.doesNotMatch(finalPrompt, new RegExp(pattern.source, "i"));
    }
    assert.doesNotMatch(finalPrompt, /no changed hairstyle/i);
    assert.match(finalPrompt, /natural hair color/i);
    assert.match(finalPrompt, /natural hair length|natural hair color, length and texture/i);
    assert.match(finalPrompt, /natural hair texture|natural hair color, length and texture/i);
    assert.match(finalPrompt, /current Hero Composition controls every variable trait/i);
  }
});
