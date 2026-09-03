export const CURRENT_HERO_COMPOSITION_MARKER = "[[CURRENT_HERO_COMPOSITION]]";

const IDENTITY_PRESERVATION_CONTRACT = [
  'IDENTITY PRESERVATION',
  '',
  'Preserve the exact identity of the person shown in the reference images.',
  '',
  'Maintain the same recognizable facial anatomy and individual facial proportions: face shape, forehead, eyebrow shape, eye shape and spacing, nose shape, cheek structure, lips, jawline, chin, natural skin tone and visual age.',
  '',
  'Do not beautify, idealize, average, rejuvenate, stylize or redesign the face. Do not replace the person with a similar-looking person. Do not alter distinctive facial features, even in medium shots, full-body compositions or unusual camera angles.',
  '',
  'Expression, gaze, head direction, head tilt, hairstyle, hair arrangement, hair parting and makeup are variable attributes of the current composition. They must follow the current Hero Composition without changing the person\'s identity or facial anatomy.',
].join('\n');

export const IDENTITY_AND_COMPOSITION_CONTRACT = [
  IDENTITY_PRESERVATION_CONTRACT,
  "Identity references define only the same person's identity, facial structure and proportions, visual age, natural eye color, and natural hair color, length and texture.",
  "Do not preserve expression, smile, lip state, gaze, head turn, head tilt, hairstyle arrangement, parting, loose strands, hair position on the shoulders, pose, framing or composition from the references.",
  "The current Hero Composition controls every variable trait above, even when it differs from the references or other frames in the series.",
].join(" ");

export type PromptValidationIssue = Readonly<{
  packageId: string;
  heroCompositionId: string;
  code:
    | "SEATED_WITHOUT_SUPPORT"
    | "SEATED_NO_FURNITURE_OR_ALTERNATE_SUPPORT"
    | "FULL_BODY_WITHOUT_LEGS_OR_VALID_CROP"
    | "CONFLICTING_GAZE"
    | "CONFLICTING_EXPRESSION"
    | "SERIES_LOCKS_VARIABLE_HAIR_OR_HEAD"
    | "OVER_SHOULDER_ORIENTATION_CONFLICT";
  message: string;
}>;

export type PromptValidationInput = Readonly<{
  packageId: string;
  heroCompositionId: string;
  seriesPrompt: string;
  heroPrompt: string;
  gaze?: string;
  emotion?: string;
}>;

const SUPPORT_PATTERN = /\b(chair|sofa|cube|bench|stool|floor|ground|paddleboard|board surface|parapet|podium|rock|step|seat)\b/i;
const FURNITURE_PATTERN = /\b(chair|sofa|cube|bench|stool|seat)\b/i;
const ALTERNATE_SUPPORT_PATTERN = /\b(floor|ground|paddleboard|board surface|parapet|podium|rock|step)\b/i;

const STABLE_NATURAL_HAIR_TRAITS = "natural hair color, length and texture";
const STABLE_NATURAL_HAIR_STATEMENT = STABLE_NATURAL_HAIR_TRAITS + " remain stable";
const FRAME_HAIRSTYLE_STATEMENT = "hairstyle arrangement follows the current Hero Composition";

export const SERIES_VARIABLE_HAIR_LOCK_PATTERNS = [
  { name: "same hairstyle", pattern: /\bsame hairstyle\b/i },
  { name: "same wet-look hairstyle", pattern: /\bsame wet-look hairstyle\b/i },
  { name: "same long loose hair", pattern: /\bthe same long loose hair across all four images\b/i },
  { name: "keep same hairstyle", pattern: /\bkeep the same hairstyle across all hero compositions\b/i },
  { name: "same loose wavy hair", pattern: /\bsame loose wavy hair\b/i },
  { name: "same loose wavy wind-touched hair", pattern: /\bsame loose wavy wind-touched hair\b/i },
  { name: "same professional luxury blowout", pattern: /\bthe same professional luxury blowout across all four images\b/i },
  { name: "same professional salon blowout", pattern: /\bsame professional salon blowout\b/i },
  { name: "same soft polished waves", pattern: /\bsame soft polished waves\b/i },
  { name: "same soft loose waves", pattern: /\bsame soft loose waves\b/i },
  { name: "same soft large loose curls", pattern: /\bthe same soft large loose curls across all four images\b/i },
  { name: "no hairstyle change", pattern: /\bno change of hairstyle between hero compositions\b/i },
  { name: "no changed hairstyle", pattern: /\bno changed hairstyle\b/i },
  { name: "locked hairstyle", pattern: /\bhairstyle is locked for the entire photoshoot(?: and must look professionally styled)?\.?/i },
  { name: "locked appearance hairstyle", pattern: /\bhairstyle is a locked appearance element[^.]*\./i },
  { name: "same hairstyle arrangement", pattern: /\b(?:same|consistent|locked) hairstyle arrangement(?: across (?:the series|all hero compositions|all four images))?\b/i },
  { name: "same hair arrangement", pattern: /\bsame hair arrangement\b/i },
  { name: "same hair volume and arrangement", pattern: /\bsame hair volume, same texture and same hair arrangement\b/i },
  { name: "do not change hair arrangement", pattern: /\bdo not change hairstyle, hair volume or hair arrangement\b/i },
  { name: "same parting", pattern: /\b(?:keep|maintain|use|the) same parting(?: across (?:the series|all hero compositions|all four images))?\b/i },
  { name: "same curls", pattern: /\b(?:keep|maintain|use|the) same curls?(?: across (?:the series|all hero compositions|all four images))?\b/i },
  { name: "same waves", pattern: /\b(?:keep|maintain|use|the) same waves?(?: across (?:the series|all hero compositions|all four images))?\b/i },
  { name: "same blowout", pattern: /\b(?:keep|maintain|use|the) same blowout(?: across (?:the series|all hero compositions|all four images))?\b/i },
  { name: "same loose hair placement", pattern: /\b(?:keep|maintain|use|the) same loose hair placement(?: across (?:the series|all hero compositions|all four images))?\b/i },
  { name: "same strand placement", pattern: /\b(?:keep|maintain|use|the) same (?:strand placement|strands)(?: across (?:the series|all hero compositions|all four images))?\b/i },
  { name: "locked variable hair detail", pattern: /\b(?:parting|curls?|waves?|blowout|loose hair placement|strand placement|strands) (?:is|are) locked (?:across|for) [^.]*\.?/i },
  { name: "semantic styled hair detail lock", pattern: /\b(?:same|consistent|locked)(?: [a-z-]+){0,4} (?:parting|curls?|waves?|blowout|loose hair placement|strand placement|strands)(?: across (?:the series|all hero compositions|all four images))?\b/i },
  { name: "hairstyle in locked list", pattern: /\bhairstyle(?=,\s*(?:makeup|accessories|jewelry))\b/i },
  { name: "same head angle", pattern: /\bsame head angle\b/i },
] as const;

const FRAME_SPECIFIC_HAIR_STYLE_PATTERNS = [
  /\bthe same (long loose hair) across all four images\b/i,
  /\bsame (loose wavy wind-touched hair)\b/i,
  /\bsame (loose wavy hair)\b/i,
  /\bthe same (professional luxury blowout) across all four images\b/i,
  /\bsame (professional salon blowout)\b/i,
  /\bsame (soft polished waves)\b/i,
  /\bthe same (soft large loose curls) across all four images\b/i,
  /\bsame (soft loose waves)\b/i,
  /\bsame (wet-look hairstyle)\b/i,
] as const;

export function normalizeCrossFrameVariableLocks(prompt: string): string {
  let normalized = prompt;

  for (const pattern of FRAME_SPECIFIC_HAIR_STYLE_PATTERNS) {
    normalized = normalized.replace(
      new RegExp(pattern.source, "gi"),
      (_match, frameStyle: string) => frameStyle + " for this frame; " + STABLE_NATURAL_HAIR_STATEMENT,
    );
  }

  for (const { pattern } of [...SERIES_VARIABLE_HAIR_LOCK_PATTERNS].sort((left, right) => right.pattern.source.length - left.pattern.source.length)) {
    normalized = normalized.replace(
      new RegExp(pattern.source, "gi"),
      FRAME_HAIRSTYLE_STATEMENT + "; " + STABLE_NATURAL_HAIR_STATEMENT,
    );
  }

  return normalized
    .replace(/\bno changed hairstyle\b/gi, FRAME_HAIRSTYLE_STATEMENT + "; " + STABLE_NATURAL_HAIR_STATEMENT)
    .replace(/\bchanged hairstyle\b/gi, "frame-specific hairstyle arrangement")
    .replace(/, hairstyle,/gi, ", " + FRAME_HAIRSTYLE_STATEMENT + "; " + STABLE_NATURAL_HAIR_STATEMENT + ",")
    .replace(/general hairstyle/gi, "frame-specific hairstyle arrangement");
}

export function normalizeSeriesVariableTraits(seriesPrompt: string): string {
  return normalizeCrossFrameVariableLocks(seriesPrompt);
}

export function splitSceneAndHeroPrompt(scenePackage: string): {
  seriesAndScene: string;
  heroComposition: string | null;
} {
  const markerIndex = scenePackage.lastIndexOf(CURRENT_HERO_COMPOSITION_MARKER);
  if (markerIndex < 0) {
    return { seriesAndScene: normalizeSeriesVariableTraits(scenePackage), heroComposition: null };
  }

  return {
    seriesAndScene: normalizeSeriesVariableTraits(scenePackage.slice(0, markerIndex).trim()),
    heroComposition: normalizeCrossFrameVariableLocks(
      scenePackage.slice(markerIndex + CURRENT_HERO_COMPOSITION_MARKER.length).trim(),
    ),
  };
}

const NEGATED_SEATED_PATTERN = /\b(?:no|not|without|avoid)\s+(?:a\s+)?(?:seated|sitting)(?:\s+(?:pose|portrait|framing|position))?\b/gi;
const NEGATED_FULL_BODY_PATTERN = /\b(?:no|not|without|avoid)\s+(?:a\s+)?(?:distant\s+)?(?:full[- ]body|full[- ]length)(?:\s+(?:framing|shot|portrait))?\b/gi;

function hasPositiveSeatedSignal(heroPrompt: string): boolean {
  return /\b(seated|sitting|sits)\b/i.test(heroPrompt.replace(NEGATED_SEATED_PATTERN, ""));
}

function hasPositiveFullBodySignal(heroPrompt: string): boolean {
  const withoutNegativeSignals = heroPrompt.replace(NEGATED_FULL_BODY_PATTERN, "");
  return (
    /\b(full[- ]body|full[- ]length|head[- ]to[- ]toe)\b/i.test(withoutNegativeSignals)
    || (/\bboth legs\b/i.test(withoutNegativeSignals) && /\bboth feet\b/i.test(withoutNegativeSignals))
  );
}

export function getPoseAnatomySafety(heroPrompt: string): string | null {
  const rules: string[] = [];
  const isSeated = hasPositiveSeatedSignal(heroPrompt);
  const isFullBody = hasPositiveFullBodySignal(heroPrompt);
  const isLongDress = /\b(long|midi|maxi|floor[- ]length)\b[^.]{0,60}\bdress\b|\bdress\b[^.]{0,60}\b(long|midi|maxi|floor[- ]length)\b/i.test(heroPrompt);
  const isOverShoulder = /over[- ](?:the[- ])?shoulder/i.test(heroPrompt);

  if (isSeated) {
    rules.push(
      "Seated anatomy safety: the pelvis must visibly contact the stated chair, sofa, cube, floor, board, parapet or other real support; keep torso weight, both legs and feet anatomically connected, with believable floor or support contact. Never leave the body floating or seated without support.",
    );
  }
  if (isFullBody) {
    rules.push(
      "Full-body anatomy safety: show two anatomically connected legs and both feet, unless the Hero Composition explicitly defines a valid intentional crop; keep limb visibility, weight bearing and the crop boundary physically believable. Never label a frame full-body while cutting off the legs unintentionally.",
    );
  }
  if (isLongDress) {
    rules.push(
      "Long-dress anatomy safety: preserve two plausible legs beneath the fabric with coherent hips, thighs and knees; fabric must drape over both legs without merging or erasing them, and must not reveal x-ray-like leg contours.",
    );
  }
  if (isOverShoulder) {
    rules.push(
      "Over-shoulder anatomy safety: align torso, shoulders, neck, head and gaze in one mild or moderate turn; avoid an extreme face-versus-body rotation, twisted neck or conflicting directions.",
    );
  }

  return rules.length > 0 ? rules.join(" ") : null;
}

export function validatePromptSource(input: PromptValidationInput): PromptValidationIssue[] {
  const issues: PromptValidationIssue[] = [];
  const hero = input.heroPrompt;
  const positiveHero = hero.split(/forbidden_substitutions:/i, 1)[0];
  const seated = hasPositiveSeatedSignal(positiveHero);
  const fullBody = hasPositiveFullBodySignal(positiveHero);
  const overShoulder = /over[- ](?:the[- ])?shoulder/i.test(positiveHero);
  const add = (code: PromptValidationIssue["code"], message: string) => {
    issues.push({ packageId: input.packageId, heroCompositionId: input.heroCompositionId, code, message });
  };

  if (seated && !SUPPORT_PATTERN.test(positiveHero)) {
    add("SEATED_WITHOUT_SUPPORT", "Seated composition has no explicit physical support.");
  }
  if (seated && /\bno furniture\b/i.test(positiveHero) && !ALTERNATE_SUPPORT_PATTERN.test(positiveHero)) {
    add("SEATED_NO_FURNITURE_OR_ALTERNATE_SUPPORT", "Seated composition removes furniture without naming alternate support.");
  }
  if (seated && !FURNITURE_PATTERN.test(positiveHero) && !ALTERNATE_SUPPORT_PATTERN.test(positiveHero)) {
    add("SEATED_NO_FURNITURE_OR_ALTERNATE_SUPPORT", "Seated composition names neither furniture nor alternate support.");
  }
  if (fullBody && !/\b(legs?|feet|body fully|full body|intentional crop|valid crop)\b/i.test(positiveHero)) {
    add("FULL_BODY_WITHOUT_LEGS_OR_VALID_CROP", "Full-body composition specifies neither legs and feet nor an intentional crop.");
  }
  if (input.gaze && /\bdirect\b/i.test(input.gaze) && /\b(no eye contact|look(?:ing)? away|not (?:into|at) the camera)\b/i.test(input.gaze)) {
    add("CONFLICTING_GAZE", "Gaze requires both direct eye contact and looking away.");
  }
  if (input.emotion && /\b(no (?:broad )?smile|neutral expression)\b/i.test(input.emotion) && /\b(smile|laugh)\b/i.test(input.emotion.replace(/no (?:broad )?smile/gi, ""))) {
    add("CONFLICTING_EXPRESSION", "Emotion requires incompatible expressions.");
  }
  if (SERIES_VARIABLE_HAIR_LOCK_PATTERNS.some(({ pattern }) => pattern.test(input.seriesPrompt))) {
    add("SERIES_LOCKS_VARIABLE_HAIR_OR_HEAD", "Series continuity locks a trait that must be controlled by the current Hero Composition.");
  }
  if (overShoulder && (!/\b(torso|body)\b/i.test(positiveHero) || !/\b(shoulder|neck)\b/i.test(positiveHero) || !/\b(turn|align)\b/i.test(positiveHero))) {
    add("OVER_SHOULDER_ORIENTATION_CONFLICT", "Over-shoulder composition does not align torso, shoulders, neck/head and gaze.");
  }

  return issues;
}
