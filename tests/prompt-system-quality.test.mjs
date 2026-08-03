import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CURRENT_HERO_COMPOSITION_MARKER,
  IDENTITY_AND_COMPOSITION_CONTRACT,
  getPoseAnatomySafety,
  normalizeSeriesVariableTraits,
  splitSceneAndHeroPrompt,
  validatePromptSource,
} from "../src/lib/ai/prompt-system-quality.ts";

const adapterSource = await readFile(
  new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url),
  "utf8",
);

test("identity contract preserves stable identity traits", () => {
  for (const trait of ["facial structure", "visual age", "natural eye color", "natural hair color", "length", "texture"]) {
    assert.match(IDENTITY_AND_COMPOSITION_CONTRACT, new RegExp(trait, "i"));
  }
});

test('identity preservation strengthens recognition without locking scene attributes', () => {
  for (const trait of ['eyebrow shape', 'eye shape and spacing', 'cheek structure', 'jawline', 'chin', 'natural skin tone', 'unusual camera angles']) {
    assert.match(IDENTITY_AND_COMPOSITION_CONTRACT, new RegExp(trait, 'i'));
  }
  assert.equal(IDENTITY_AND_COMPOSITION_CONTRACT.match(/IDENTITY PRESERVATION/g)?.length, 1);
  assert.match(IDENTITY_AND_COMPOSITION_CONTRACT, /Expression, gaze, head direction, head tilt, hairstyle, hair arrangement, hair parting and makeup are variable attributes/i);
  assert.match(IDENTITY_AND_COMPOSITION_CONTRACT, /must follow the current Hero Composition without changing the person's identity or facial anatomy/i);
});

test("identity contract releases every variable facial and hair trait", () => {
  for (const trait of ["expression", "smile", "lip state", "gaze", "head turn", "head tilt", "hairstyle arrangement", "parting", "loose strands", "hair position"]) {
    assert.match(IDENTITY_AND_COMPOSITION_CONTRACT, new RegExp(trait, "i"));
  }
});

test("current Hero Composition explicitly controls variable traits", () => {
  assert.match(IDENTITY_AND_COMPOSITION_CONTRACT, /current Hero Composition controls every variable trait/i);
});

test("identity contract is inserted once in production prompt assembly", () => {
  assert.equal(adapterSource.match(/IDENTITY_AND_COMPOSITION_CONTRACT/g)?.length, 2);
  assert.equal(adapterSource.match(/\[IDENTITY_V2, IDENTITY_AND_COMPOSITION_CONTRACT\]/g)?.length, 1);
});

test("series normalization removes hairstyle locks but keeps stable hair traits", () => {
  const normalized = normalizeSeriesVariableTraits("same hairstyle; changed hairstyle; same hair arrangement; same head angle");
  assert.doesNotMatch(normalized, /same hairstyle|changed hairstyle|same hair arrangement|same head angle/i);
  assert.match(normalized, /natural hair color, length and texture/i);
});

test("cross-frame normalization preserves stable hair traits and releases arrangement", () => {
  const normalized = normalizeSeriesVariableTraits("natural hair color, natural hair length and natural hair texture; no changed hairstyle");
  assert.match(normalized, /natural hair color/i);
  assert.match(normalized, /natural hair length/i);
  assert.match(normalized, /natural hair texture/i);
  assert.match(normalized, /hairstyle arrangement follows the current Hero Composition/i);
  assert.doesNotMatch(normalized, /changed natural hair color|changed natural hair length|changed natural hair texture/i);
});

test("Hero Composition normalization preserves frame-specific styling", () => {
  const split = splitSceneAndHeroPrompt(
    `series ${CURRENT_HERO_COMPOSITION_MARKER} locked_elements: same professional salon blowout. forbidden_substitutions: no changed hairstyle.`,
  );
  assert.match(split.heroComposition ?? "", /professional salon blowout for this frame/i);
  assert.match(split.heroComposition ?? "", /natural hair color, length and texture remain stable/i);
  assert.match(split.heroComposition ?? "", /hairstyle arrangement follows the current Hero Composition/i);
  assert.doesNotMatch(split.heroComposition ?? "", /same professional salon blowout|no changed hairstyle/i);
});

test("series normalization releases head angle", () => {
  assert.doesNotMatch(normalizeSeriesVariableTraits("same head angle"), /same head angle/i);
});

test("scene package is split before the current Hero Composition", () => {
  const split = splitSceneAndHeroPrompt(`series ${CURRENT_HERO_COMPOSITION_MARKER} HC-007`);
  assert.equal(split.seriesAndScene, "series");
  assert.equal(split.heroComposition, "HC-007");
});

test("generic scene without Hero Composition remains intact", () => {
  const split = splitSceneAndHeroPrompt("generic portrait scene");
  assert.equal(split.seriesAndScene, "generic portrait scene");
  assert.equal(split.heroComposition, null);
});

test("production block order places Hero Composition after series and scene", () => {
  assert.ok(adapterSource.indexOf("seriesAndScene,") < adapterSource.indexOf("Current Hero Composition - highest priority"));
});

test("production block order places anatomy safety after Hero Composition", () => {
  assert.ok(adapterSource.indexOf("Current Hero Composition - highest priority") < adapterSource.indexOf("poseAnatomySafety,"));
});

test("production block order places realism after anatomy safety", () => {
  assert.ok(adapterSource.indexOf("poseAnatomySafety,") < adapterSource.indexOf("[REALISM_V1, STYLE_MVP]"));
});

test("seated composition receives support and limb safety", () => {
  const suffix = getPoseAnatomySafety("seated on a low cube with both legs visible");
  assert.match(suffix ?? "", /pelvis must visibly contact/i);
  assert.match(suffix ?? "", /both legs and feet/i);
});

test("full-body long-dress composition receives both category rules", () => {
  const suffix = getPoseAnatomySafety("full-body portrait in a floor-length dress with both feet visible");
  assert.match(suffix ?? "", /Full-body anatomy safety/i);
  assert.match(suffix ?? "", /Long-dress anatomy safety/i);
});

test("negative full-body wording does not trigger full-body safety", () => {
  for (const phrase of ["no full-body framing", "not full-body", "without full-body framing", "avoid full-body", "no full-length", "not a full-length shot"]) {
    assert.doesNotMatch(getPoseAnatomySafety(`over-the-shoulder portrait, ${phrase}`) ?? "", /Full-body anatomy safety/i);
  }
});

test("positive full-body wording triggers only full-body safety when seated is negated", () => {
  const safety = getPoseAnatomySafety("Full Body / Top-Down Aerial Editorial; no seated pose") ?? "";
  assert.match(safety, /Full-body anatomy safety/i);
  assert.doesNotMatch(safety, /Seated anatomy safety/i);
});

test("seated full-body composition receives both safety rules", () => {
  const safety = getPoseAnatomySafety("seated full-body portrait on a chair with both legs and both feet visible") ?? "";
  assert.match(safety, /Seated anatomy safety/i);
  assert.match(safety, /Full-body anatomy safety/i);
});

test("close portrait receives no full-body safety", () => {
  assert.doesNotMatch(getPoseAnatomySafety("chest-up close portrait, no full-body framing") ?? "", /Full-body anatomy safety/i);
});

test("over-shoulder composition receives aligned-turn safety", () => {
  assert.match(getPoseAnatomySafety("over-the-shoulder portrait") ?? "", /align torso, shoulders, neck, head and gaze/i);
});

test("validator flags seated composition without support", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-1", seriesPrompt: "", heroPrompt: "seated portrait" });
  assert.ok(issues.some((issue) => issue.code === "SEATED_WITHOUT_SUPPORT"));
});

test("validator flags seated no-furniture composition without alternate support", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-2", seriesPrompt: "", heroPrompt: "seated portrait, no furniture" });
  assert.ok(issues.some((issue) => issue.code === "SEATED_NO_FURNITURE_OR_ALTERNATE_SUPPORT"));
});

test("validator accepts floor sitting as alternate support", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-3", seriesPrompt: "", heroPrompt: "sitting on the floor, no furniture, both legs visible" });
  assert.equal(issues.filter((issue) => issue.code.startsWith("SEATED_")).length, 0);
});

test("validator flags full-body composition without legs or valid crop", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-4", seriesPrompt: "", heroPrompt: "full-body environmental portrait" });
  assert.ok(issues.some((issue) => issue.code === "FULL_BODY_WITHOUT_LEGS_OR_VALID_CROP"));
});

test("validator accepts full-body composition with legs and feet", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-5", seriesPrompt: "", heroPrompt: "full-body portrait with both legs and feet visible" });
  assert.equal(issues.some((issue) => issue.code === "FULL_BODY_WITHOUT_LEGS_OR_VALID_CROP"), false);
});

test("validator flags conflicting gaze", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-6", seriesPrompt: "", heroPrompt: "portrait", gaze: "direct eye contact and no eye contact with camera" });
  assert.ok(issues.some((issue) => issue.code === "CONFLICTING_GAZE"));
});

test("validator flags conflicting expression", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-7", seriesPrompt: "", heroPrompt: "portrait", emotion: "neutral expression with a warm smile" });
  assert.ok(issues.some((issue) => issue.code === "CONFLICTING_EXPRESSION"));
});

test("validator flags series locks on variable hair traits", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-8", seriesPrompt: "keep the same hairstyle", heroPrompt: "portrait" });
  assert.ok(issues.some((issue) => issue.code === "SERIES_LOCKS_VARIABLE_HAIR_OR_HEAD"));
});

test("validator flags incomplete over-shoulder orientation", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-9", seriesPrompt: "", heroPrompt: "over-the-shoulder gaze toward camera" });
  assert.ok(issues.some((issue) => issue.code === "OVER_SHOULDER_ORIENTATION_CONFLICT"));
});

test("validator accepts aligned over-shoulder orientation", () => {
  const issues = validatePromptSource({ packageId: "SP-X", heroCompositionId: "HC-10", seriesPrompt: "", heroPrompt: "over-the-shoulder portrait with torso turned, shoulder and neck aligned in a mild turn" });
  assert.equal(issues.some((issue) => issue.code === "OVER_SHOULDER_ORIENTATION_CONFLICT"), false);
});
