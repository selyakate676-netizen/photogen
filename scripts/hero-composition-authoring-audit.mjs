import { readFile } from "node:fs/promises";

import { PRODUCTION_HERO_COMPOSITION_CONTRACTS } from "../src/lib/ai/hero-composition-catalog.ts";
import {
  getHeroCompositionAuditStatus,
  validateHeroCompositionAuthoring,
  validateHeroCompositionPack,
} from "../src/lib/ai/hero-composition-authoring.ts";

const source = await readFile(new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url), "utf8");

function parseFields(prompt) {
  const matches = [...prompt.matchAll(/(?:^|\.\s)([a-z_]+):\s/g)];
  const raw = {};
  for (const [index, match] of matches.entries()) {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? prompt.length;
    raw[match[1]] = prompt.slice(start, end).replace(/\.\s*$/, "").trim();
  }
  return {
    expression: raw.expression ?? raw.emotion,
    gaze: raw.gaze,
    head_turn: raw.head_turn,
    head_tilt: raw.head_tilt,
    hairstyle_arrangement: raw.hairstyle_arrangement,
    hair_parting: raw.hair_parting,
    hair_shoulder_placement: raw.hair_shoulder_placement,
    framing: raw.framing ?? raw.shot_size,
    body_pose: raw.body_pose ?? raw.subject_position,
    support_object: raw.support_object,
    pelvis_contact: raw.pelvis_contact,
    left_leg_position: raw.left_leg_position,
    right_leg_position: raw.right_leg_position,
    left_foot_contact: raw.left_foot_contact,
    right_foot_contact: raw.right_foot_contact,
    weight_distribution: raw.weight_distribution,
    limb_visibility: raw.limb_visibility,
    crop: raw.crop,
    left_foot_visibility: raw.left_foot_visibility,
    right_foot_visibility: raw.right_foot_visibility,
    weight_bearing: raw.weight_bearing,
    crop_boundary: raw.crop_boundary,
    torso_direction: raw.torso_direction,
    shoulder_direction: raw.shoulder_direction,
    neck_alignment: raw.neck_alignment,
  };
}

function detectKinds(prompt, fields) {
  const positivePrompt = prompt.split(/\.\sforbidden_substitutions:/i, 1)[0];
  const searchable = `${fields.framing ?? ""} ${fields.body_pose ?? ""} ${positivePrompt}`
    .replace(/\b(?:no|not|without|avoid)\s+(?:a\s+)?(?:seated|sitting)(?:\s+(?:pose|portrait|framing|position))?\b/gi, "")
    .replace(/\b(?:no|not|without|avoid)\s+(?:a\s+)?(?:distant\s+)?(?:full[- ]body|full[- ]length)(?:\s+(?:framing|shot|portrait))?\b/gi, "");
  const kinds = [];
  if (/\b(seated|sitting|sits)\b/i.test(searchable)) kinds.push("seated");
  if (/\b(full[- ]body|full[- ]length|head[- ]to[- ]toe)\b/i.test(searchable)) kinds.push("full-body");
  if (/over[- ](?:the[- ])?shoulder/i.test(searchable)) kinds.push("over-shoulder");
  if (kinds.length === 0) kinds.push("portrait");
  return kinds;
}

const functionMatches = [...source.matchAll(/function getSp(\d+)HeroScenePackages\(\): string\[\] \{/g)];
let packages = new Map();

for (const [index, match] of functionMatches.entries()) {
  const sectionStart = match.index ?? 0;
  const sectionEnd = functionMatches[index + 1]?.index ?? source.indexOf("function getHeroScenePackagesForPhotoshoot");
  const section = source.slice(sectionStart, sectionEnd);
  const packageId = `SP-${match[1]}`;
  const compositions = [...section.matchAll(/promptText:\s*\r?\n?\s*"([^"]+)"/g)].map((heroMatch) => {
    const prompt = heroMatch[1];
    const heroCompositionId = prompt.match(/HC-\d+/)?.[0] ?? "UNKNOWN";
    const fields = parseFields(prompt);
    return { packageId, heroCompositionId, kinds: detectKinds(prompt, fields), fields };
  });
  packages.set(packageId, compositions);
}

const sourceKeys = [...packages].flatMap(([packageId, compositions]) =>
  compositions.map((composition) => `${packageId}/${composition.heroCompositionId}`),
);
const contractKeys = PRODUCTION_HERO_COMPOSITION_CONTRACTS.map(
  (contract) => `${contract.packageId}/${contract.heroCompositionId}`,
);
if (sourceKeys.length !== 28 || JSON.stringify(sourceKeys.sort()) !== JSON.stringify(contractKeys.sort())) {
  throw new Error(`Production HC/catalog mismatch: source=${sourceKeys.length}, contracts=${contractKeys.length}`);
}
packages = Map.groupBy(PRODUCTION_HERO_COMPOSITION_CONTRACTS, (contract) => contract.packageId);

const rows = [];
for (const [packageId, compositions] of packages) {
  const packIssues = validateHeroCompositionPack({ packageId, compositions });
  for (const composition of compositions) {
    const issues = validateHeroCompositionAuthoring(composition);
    const missingFrame = issues.filter((issue) => issue.code === "MISSING_FRAME_FIELD").map((issue) => issue.field);
    const missingAnatomy = issues.filter((issue) => issue.code === "MISSING_ANATOMY_FIELD").map((issue) => issue.field);
    const relevantPackIssues = packIssues.map((issue) => issue.conflict);
    rows.push({
      packageId,
      heroCompositionId: composition.heroCompositionId,
      missingFrame,
      missingAnatomy,
      packIssues: relevantPackIssues,
      status: getHeroCompositionAuditStatus([...issues, ...packIssues]),
      issues: [...issues, ...packIssues],
    });
  }
}

console.log("| Package | HC | Missing frame fields | Missing anatomy fields | Pack variation issue | Status |");
console.log("| --- | --- | --- | --- | --- | --- |");
for (const row of rows) {
  console.log(`| ${row.packageId} | ${row.heroCompositionId} | ${row.missingFrame.join(", ") || "—"} | ${row.missingAnatomy.join(", ") || "—"} | ${row.packIssues.join("; ") || "—"} | ${row.status} |`);
}

const totals = rows.reduce((summary, row) => ({ ...summary, [row.status]: (summary[row.status] ?? 0) + 1 }), {});
console.log(`\nChecked: ${rows.length}; BLOCKER: ${totals.BLOCKER ?? 0}; NEEDS_UPDATE: ${totals.NEEDS_UPDATE ?? 0}; VALID: ${totals.VALID ?? 0}`);
const typeCount = (kind) => PRODUCTION_HERO_COMPOSITION_CONTRACTS.filter((contract) => contract.kinds.includes(kind)).length;
console.log(`Packs: ${packages.size}; seated: ${typeCount("seated")}; full-body: ${typeCount("full-body")}; over-shoulder: ${typeCount("over-shoulder")}`);

if (rows.length !== 28 || totals.VALID !== 28 || packages.size !== 7) process.exitCode = 1;
