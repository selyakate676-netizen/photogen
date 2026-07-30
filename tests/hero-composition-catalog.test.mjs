import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCTION_HERO_COMPOSITION_CONTRACTS,
  getHeroCompositionContract,
  renderHeroCompositionContract,
} from "../src/lib/ai/hero-composition-catalog.ts";
import {
  FULL_BODY_ANATOMY_FIELDS,
  HERO_COMPOSITION_FRAME_FIELDS,
  OVER_SHOULDER_ANATOMY_FIELDS,
  SEATED_ANATOMY_FIELDS,
  validateHeroCompositionAuthoring,
  validateHeroCompositionPack,
} from "../src/lib/ai/hero-composition-authoring.ts";
import {
  CURRENT_HERO_COMPOSITION_MARKER,
  SERIES_VARIABLE_HAIR_LOCK_PATTERNS,
  getPoseAnatomySafety,
  splitSceneAndHeroPrompt,
} from "../src/lib/ai/prompt-system-quality.ts";

const source = await readFile(new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url), "utf8");

function getLegacyPrompts() {
  const prompts = [];
  const functions = [...source.matchAll(/function getSp(\d+)HeroScenePackages\(\): string\[\] \{/g)];
  for (const [index, match] of functions.entries()) {
    const start = match.index ?? 0;
    const end = functions[index + 1]?.index ?? source.indexOf("function getHeroScenePackagesForPhotoshoot");
    const packageId = `SP-${match[1]}`;
    for (const heroMatch of source.slice(start, end).matchAll(/promptText:\s*\r?\n?\s*"([^"]+)"/g)) {
      const heroCompositionId = heroMatch[1].match(/HC-\d+/)?.[0] ?? "UNKNOWN";
      prompts.push({ packageId, heroCompositionId, prompt: heroMatch[1] });
    }
  }
  return prompts;
}

const legacyPrompts = getLegacyPrompts();

test("all 28 production HC pass the authoring contract", () => {
  assert.equal(PRODUCTION_HERO_COMPOSITION_CONTRACTS.length, 28);
  assert.deepEqual(
    PRODUCTION_HERO_COMPOSITION_CONTRACTS.flatMap(validateHeroCompositionAuthoring),
    [],
  );
});

test("all seven production packs pass variation validation", () => {
  const packages = Map.groupBy(PRODUCTION_HERO_COMPOSITION_CONTRACTS, (contract) => contract.packageId);
  assert.equal(packages.size, 7);
  for (const [packageId, compositions] of packages) {
    assert.deepEqual(validateHeroCompositionPack({ packageId, compositions }), [], packageId);
  }
});

test("every production HC has concrete hairstyle, parting and shoulder placement", () => {
  for (const contract of PRODUCTION_HERO_COMPOSITION_CONTRACTS) {
    assert.match(contract.fields.hairstyle_arrangement ?? "", /\S/, `${contract.packageId}/${contract.heroCompositionId}`);
    assert.match(contract.fields.hair_parting ?? "", /\S/, `${contract.packageId}/${contract.heroCompositionId}`);
    assert.match(contract.fields.hair_shoulder_placement ?? "", /\S/, `${contract.packageId}/${contract.heroCompositionId}`);
    assert.doesNotMatch(contract.fields.hairstyle_arrangement ?? "", /different|may vary|reference/i);
  }
});

test("pose-specific production contracts contain every anatomy field", () => {
  for (const contract of PRODUCTION_HERO_COMPOSITION_CONTRACTS) {
    const required = contract.kinds.flatMap((kind) => {
      if (kind === "seated") return SEATED_ANATOMY_FIELDS;
      if (kind === "full-body") return FULL_BODY_ANATOMY_FIELDS;
      if (kind === "over-shoulder") return OVER_SHOULDER_ANATOMY_FIELDS;
      return [];
    });
    for (const field of required) {
      assert.match(contract.fields[field] ?? "", /\S/, `${contract.packageId}/${contract.heroCompositionId}/${field}`);
    }
  }
});

test("structured fields are rendered into CURRENT_HERO_COMPOSITION", () => {
  assert.match(source, /renderHeroCompositionContract\(packageId, hero\.id\)/);
  for (const contract of PRODUCTION_HERO_COMPOSITION_CONTRACTS) {
    const rendered = renderHeroCompositionContract(contract.packageId, contract.heroCompositionId);
    assert.match(rendered, /superseded and must be ignored/);
    for (const field of HERO_COMPOSITION_FRAME_FIELDS) {
      assert.match(rendered, new RegExp(`\\b${field}:`), `${contract.packageId}/${contract.heroCompositionId}/${field}`);
    }
    for (const [field, value] of Object.entries(contract.fields)) {
      assert.match(rendered, new RegExp(`${field}: ${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
  }
});

test("all 28 assembled hero prompts contain contract data and no cross-frame hair locks", () => {
  assert.equal(legacyPrompts.length, 28);
  for (const item of legacyPrompts) {
    const assembled = `${item.prompt} ${renderHeroCompositionContract(item.packageId, item.heroCompositionId)}`;
    const split = splitSceneAndHeroPrompt(`series ${CURRENT_HERO_COMPOSITION_MARKER} ${assembled}`);
    const heroPrompt = split.heroComposition ?? "";
    assert.match(heroPrompt, /structured_contract_authoritative:/);
    assert.match(heroPrompt, /hairstyle_arrangement:/);
    assert.match(heroPrompt, /hair_parting:/);
    for (const { pattern } of SERIES_VARIABLE_HAIR_LOCK_PATTERNS) {
      assert.doesNotMatch(heroPrompt, new RegExp(pattern.source, "i"), `${item.packageId}/${item.heroCompositionId}`);
    }
    const contract = getHeroCompositionContract(item.packageId, item.heroCompositionId);
    const anatomy = getPoseAnatomySafety(heroPrompt);
    if (contract.kinds.some((kind) => kind !== "portrait")) assert.match(anatomy ?? "", /anatomy safety/i);
  }
});

test("smoke defects remain covered by structured regression fixtures", () => {
  const seated = getHeroCompositionContract("SP-009", "HC-002");
  assert.match(seated.fields.left_foot_contact ?? "", /flat on the floor/i);
  assert.match(seated.fields.right_foot_contact ?? "", /contact the floor/i);
  assert.match(seated.fields.limb_visibility ?? "", /both knees, lower legs, ankles and feet/i);

  const fullBody = getHeroCompositionContract("SP-005", "HC-001");
  assert.match(fullBody.fields.left_foot_visibility ?? "", /entire left foot/i);
  assert.match(fullBody.fields.right_foot_visibility ?? "", /entire right foot/i);
  assert.match(fullBody.fields.crop_boundary ?? "", /head to both toes/i);

  const overShoulder = getHeroCompositionContract("SP-007", "HC-003");
  assert.match(overShoulder.fields.neck_alignment ?? "", /natural continuous line/i);
  assert.equal(overShoulder.fields.hairstyle_arrangement, "low loose bun");
  assert.equal(overShoulder.fields.hair_parting, "side part to the subject's right");
  const overShoulderLegacy = legacyPrompts.find(
    (item) => item.packageId === "SP-007" && item.heroCompositionId === "HC-003",
  );
  assert.match(overShoulderLegacy?.prompt ?? "", /low loose bun with side part/i);
  assert.doesNotMatch(overShoulderLegacy?.prompt ?? "", /no tied-up hair|same loose wavy wind-touched hair/i);
});

test("MVP temporarily excludes only SP-007 HC-003 while preserving its catalog contract", () => {
  const start = source.indexOf("function getSp007HeroScenePackages(): string[] {");
  const end = source.indexOf("function isSp008Style", start);
  const sp007RuntimeSource = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(sp007RuntimeSource, /\.filter\(\(hero\) => hero\.id !== "HC-003"\)/);
  assert.equal([...source.matchAll(/\.filter\(\(hero\) => hero\.id !== "HC-\d+"\)/g)].length, 1);
  assert.deepEqual(
    [...sp007RuntimeSource.matchAll(/id: "(HC-\d+)"/g)].map((match) => match[1]),
    ["HC-001", "HC-002", "HC-003", "HC-004"],
  );
  assert.equal(getHeroCompositionContract("SP-007", "HC-003").heroCompositionId, "HC-003");
});
