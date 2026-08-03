import { readFile } from "node:fs/promises";

import {
  PRODUCTION_HERO_COMPOSITION_CONTRACTS,
  renderHeroCompositionContract,
} from "../src/lib/ai/hero-composition-catalog.ts";
import {
  validateHeroCompositionAuthoring,
  validateHeroCompositionPack,
} from "../src/lib/ai/hero-composition-authoring.ts";
import {
  CURRENT_HERO_COMPOSITION_MARKER,
  IDENTITY_AND_COMPOSITION_CONTRACT,
  SERIES_VARIABLE_HAIR_LOCK_PATTERNS,
  getPoseAnatomySafety,
  splitSceneAndHeroPrompt,
  validatePromptSource,
} from "../src/lib/ai/prompt-system-quality.ts";

const source = await readFile(new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url), "utf8");
const legacyByKey = new Map();
const functions = [...source.matchAll(/function getSp(\d+)HeroScenePackages\(\): string\[\] \{/g)];
for (const [index, match] of functions.entries()) {
  const start = match.index ?? 0;
  const end = functions[index + 1]?.index ?? source.indexOf("function getHeroScenePackagesForPhotoshoot");
  const packageId = `SP-${match[1]}`;
  for (const heroMatch of source.slice(start, end).matchAll(/promptText:\s*\r?\n?\s*"([^"]+)"/g)) {
    const heroCompositionId = heroMatch[1].match(/HC-\d+/)?.[0] ?? "UNKNOWN";
    legacyByKey.set(`${packageId}/${heroCompositionId}`, heroMatch[1]);
  }
}

const packs = Map.groupBy(PRODUCTION_HERO_COMPOSITION_CONTRACTS, (contract) => contract.packageId);
const packIssues = new Map([...packs].map(([packageId, compositions]) => [
  packageId,
  validateHeroCompositionPack({ packageId, compositions }),
]));

console.log("| Package | HC | Contract | Pack variation | Final prompt validation | Result |");
console.log("| --- | --- | --- | --- | --- | --- |");
let failures = 0;
for (const contract of PRODUCTION_HERO_COMPOSITION_CONTRACTS) {
  const key = `${contract.packageId}/${contract.heroCompositionId}`;
  const legacy = legacyByKey.get(key);
  if (!legacy) throw new Error(`Legacy production HC not found: ${key}`);
  const rendered = renderHeroCompositionContract(contract.packageId, contract.heroCompositionId);
  const split = splitSceneAndHeroPrompt(`production series ${CURRENT_HERO_COMPOSITION_MARKER} ${legacy} ${rendered}`);
  const hero = split.heroComposition ?? "";
  const anatomy = getPoseAnatomySafety(hero);
  const finalPrompt = [
    "Generation task: create one new realistic professional photograph.",
    IDENTITY_AND_COMPOSITION_CONTRACT,
    "Persona appearance: immutable order snapshot and known body profile.",
    split.seriesAndScene,
    `Current Hero Composition - highest priority for variable traits:\n${hero}`,
    anatomy,
    "Realistic natural photograph with believable anatomy.",
    "One photograph only; preserve identity and follow the current Hero Composition.",
  ].filter(Boolean).join("\n\n");

  const contractValidation = validateHeroCompositionAuthoring(contract);
  const variationValidation = packIssues.get(contract.packageId) ?? [];
  const sourceValidation = validatePromptSource({
    packageId: contract.packageId,
    heroCompositionId: contract.heroCompositionId,
    seriesPrompt: split.seriesAndScene,
    heroPrompt: hero,
  });
  const finalIssues = [];
  if (!/expression:/.test(finalPrompt) || !/gaze:/.test(finalPrompt) || !/head_turn:/.test(finalPrompt) || !/head_tilt:/.test(finalPrompt)) finalIssues.push("missing frame variables");
  if (!/hairstyle_arrangement:/.test(finalPrompt) || !/hair_parting:/.test(finalPrompt) || !/hair_shoulder_placement:/.test(finalPrompt)) finalIssues.push("missing hair target");
  if (SERIES_VARIABLE_HAIR_LOCK_PATTERNS.some(({ pattern }) => pattern.test(finalPrompt))) finalIssues.push("cross-frame hair lock");
  if (contract.kinds.includes("seated") && !/Seated anatomy safety:/.test(anatomy ?? "")) finalIssues.push("missing seated safety");
  if (contract.kinds.includes("full-body") && !/Full-body anatomy safety:/.test(anatomy ?? "")) finalIssues.push("missing full-body safety");
  if (contract.kinds.includes("over-shoulder") && !/Over-shoulder anatomy safety:/.test(anatomy ?? "")) finalIssues.push("missing over-shoulder safety");
  const issues = [...contractValidation, ...variationValidation, ...sourceValidation, ...finalIssues];
  const result = issues.length === 0 ? "PASS" : "FAIL";
  if (result === "FAIL") failures += 1;
  console.log(`| ${contract.packageId} | ${contract.heroCompositionId} | ${contractValidation.length ? "FAIL" : "VALID"} | ${variationValidation.length ? "FAIL" : "VALID"} | ${sourceValidation.length || finalIssues.length ? "FAIL" : "VALID"} | ${result} |`);
  if (issues.length) console.log(JSON.stringify({ key, issues }, null, 2));
}

console.log(`\nChecked: ${PRODUCTION_HERO_COMPOSITION_CONTRACTS.length}; failures: ${failures}; provider calls: 0`);
if (PRODUCTION_HERO_COMPOSITION_CONTRACTS.length !== 28 || failures !== 0) process.exitCode = 1;
