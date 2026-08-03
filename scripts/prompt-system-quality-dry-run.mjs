import { readFile } from "node:fs/promises";
import { renderHeroCompositionContract } from "../src/lib/ai/hero-composition-catalog.ts";
import {
  CURRENT_HERO_COMPOSITION_MARKER,
  IDENTITY_AND_COMPOSITION_CONTRACT,
  getPoseAnatomySafety,
  splitSceneAndHeroPrompt,
  validatePromptSource,
} from "../src/lib/ai/prompt-system-quality.ts";

const adapterSource = await readFile(
  new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url),
  "utf8",
);

function getProductionHeroPrompt(packageId, heroCompositionId) {
  const digits = packageId.slice(3);
  const startMarker = `function getSp${digits}HeroScenePackages(): string[] {`;
  const start = adapterSource.indexOf(startMarker);
  if (start < 0) throw new Error(`Production package not found: ${packageId}`);
  const nextPackage = adapterSource.indexOf("function getSp", start + startMarker.length);
  const catalogEnd = adapterSource.indexOf("function getHeroScenePackagesForPhotoshoot", start);
  const end = nextPackage >= 0 ? nextPackage : catalogEnd;
  const section = adapterSource.slice(start, end);
  const prompts = [...section.matchAll(/promptText:\s*\r?\n?\s*"([^"]+)"/g)].map((match) => match[1]);
  const prompt = prompts.find((candidate) => candidate.startsWith(`${heroCompositionId}:`));
  if (!prompt) throw new Error(`Production HC not found: ${packageId}/${heroCompositionId}`);
  return prompt;
}

const controls = [
  {
    packageId: "SP-009",
    heroCompositionId: "HC-001",
    actualType: "Chest-up Editorial Portrait",
    series: "Series and scene: Minimal Black Studio, same black outfit and cool matte studio light.",
  },
  {
    packageId: "SP-009",
    heroCompositionId: "HC-002",
    actualType: "Seated editorial portrait",
    series: "Series and scene: Minimal Black Studio, same black outfit and cool matte studio light.",
  },
  {
    packageId: "SP-005",
    heroCompositionId: "HC-001",
    actualType: "Full Body / Top-Down Aerial Editorial",
    series: "Series and scene: SUP Editorial, same swimsuit, paddleboard and premium aquatic environment.",
  },
  {
    packageId: "SP-007",
    heroCompositionId: "HC-003",
    actualType: "Three-quarter over-shoulder portrait",
    series: "Series and scene: Lakeside Walk, same light dress and golden-hour lakeside environment.",
  },
];

for (const control of controls) {
  const legacyHeroPrompt = getProductionHeroPrompt(control.packageId, control.heroCompositionId);
  const productionHeroPrompt = `${legacyHeroPrompt} ${renderHeroCompositionContract(control.packageId, control.heroCompositionId)}`;
  const { seriesAndScene, heroComposition } = splitSceneAndHeroPrompt(
    `${control.series} ${CURRENT_HERO_COMPOSITION_MARKER} ${productionHeroPrompt}`,
  );
  const anatomy = getPoseAnatomySafety(heroComposition ?? "");
  const blocks = [
    ["GENERATION_TASK", "Generation task: create one new realistic professional photograph."],
    ["IDENTITY", IDENTITY_AND_COMPOSITION_CONTRACT],
    ["PERSONA_APPEARANCE", "Persona appearance: use the immutable order snapshot and known body profile; do not invent measurements."],
    ["SERIES_AND_SCENE", seriesAndScene],
    ["CURRENT_HERO_COMPOSITION", heroComposition],
    ["POSE_ANATOMY_SAFETY", anatomy],
    ["REALISM", "Realistic natural photograph, natural skin and body proportions, no pasted face or CGI look."],
    ["SHORT_CONSTRAINTS", "One photograph only; preserve identity; follow the current Hero Composition."],
  ].filter(([, value]) => value);
  const validation = validatePromptSource({
    packageId: control.packageId,
    heroCompositionId: control.heroCompositionId,
    seriesPrompt: seriesAndScene,
    heroPrompt: heroComposition ?? "",
  });

  console.log(JSON.stringify({
    packageId: control.packageId,
    heroCompositionId: control.heroCompositionId,
    actualType: control.actualType,
    blockOrder: blocks.map(([name]) => name),
    referenceCount: 2,
    referenceOrder: "first 2 unique Persona snapshot photos, original order after deduplication",
    referencePolicy: "unchanged",
    model: "openai/gpt-image-2",
    providerParameters: {
      aspect_ratio: "2:3",
      quality: "high",
      output_format: "jpeg",
      number_of_images: 1,
      output_compression: 95,
    },
    anatomySafetyBlock: anatomy,
    validation,
    prompt: blocks.map(([, value]) => value).join("\n\n"),
  }, null, 2));
}
