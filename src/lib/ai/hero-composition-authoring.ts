export const HERO_COMPOSITION_FRAME_FIELDS = [
  "expression",
  "gaze",
  "head_turn",
  "head_tilt",
  "hairstyle_arrangement",
  "hair_parting",
  "hair_shoulder_placement",
  "framing",
  "body_pose",
] as const;

export const SEATED_ANATOMY_FIELDS = [
  "support_object",
  "pelvis_contact",
  "left_leg_position",
  "right_leg_position",
  "left_foot_contact",
  "right_foot_contact",
  "weight_distribution",
  "limb_visibility",
  "crop",
] as const;

export const FULL_BODY_ANATOMY_FIELDS = [
  "left_leg_position",
  "right_leg_position",
  "left_foot_visibility",
  "right_foot_visibility",
  "weight_bearing",
  "crop_boundary",
] as const;

export const OVER_SHOULDER_ANATOMY_FIELDS = [
  "torso_direction",
  "shoulder_direction",
  "head_turn",
  "head_tilt",
  "neck_alignment",
  "gaze",
  "hairstyle_arrangement",
  "hair_parting",
] as const;

export type HeroCompositionField =
  | (typeof HERO_COMPOSITION_FRAME_FIELDS)[number]
  | (typeof SEATED_ANATOMY_FIELDS)[number]
  | (typeof FULL_BODY_ANATOMY_FIELDS)[number]
  | (typeof OVER_SHOULDER_ANATOMY_FIELDS)[number];

export type HeroCompositionKind = "portrait" | "seated" | "full-body" | "over-shoulder";

export type HeroCompositionAuthoringInput = Readonly<{
  packageId: string;
  heroCompositionId: string;
  kinds: readonly HeroCompositionKind[];
  fields: Readonly<Partial<Record<HeroCompositionField, string>>>;
}>;

export type HeroCompositionAuthoringIssue = Readonly<{
  packageId: string;
  heroCompositionId: string;
  field: HeroCompositionField | "pack_variation" | "package_hairstyle_target";
  code:
    | "MISSING_FRAME_FIELD"
    | "MISSING_ANATOMY_FIELD"
    | "NON_POSITIVE_FRAME_VALUE"
    | "INVALID_NOT_VISIBLE"
    | "PACK_LACKS_VARIATION"
    | "PACK_VARIATION_UNVERIFIABLE"
    | "PACKAGE_HAIRSTYLE_INHERITS_REFERENCE";
  severity: "BLOCKER" | "NEEDS_UPDATE";
  conflict: string;
  recommendation: string;
}>;

export type HeroCompositionPackInput = Readonly<{
  packageId: string;
  compositions: readonly HeroCompositionAuthoringInput[];
  hairstylePolicy?: "frame_specific" | "package_locked";
  packageHairstyleTarget?: string;
}>;

const VAGUE_VALUE_PATTERNS = [
  /\bdifferent hairstyle\b/i,
  /\bdo not copy (?:the )?reference hairstyle\b/i,
  /\bhairstyle may vary\b/i,
  /^natural expression\.?$/i,
  /^subtle head angle\.?$/i,
] as const;

const REQUIRED_BY_KIND: Readonly<Record<Exclude<HeroCompositionKind, "portrait">, readonly HeroCompositionField[]>> = {
  seated: SEATED_ANATOMY_FIELDS,
  "full-body": FULL_BODY_ANATOMY_FIELDS,
  "over-shoulder": OVER_SHOULDER_ANATOMY_FIELDS,
};

function isMissing(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

function allowsNotVisible(field: HeroCompositionField, framing: string | undefined): boolean {
  if (!framing || !/\b(close|close-up|headshot|head-and-shoulders|chest-up)\b/i.test(framing)) return false;
  return field === "body_pose" || field === "hair_shoulder_placement";
}

export function validateHeroCompositionAuthoring(
  input: HeroCompositionAuthoringInput,
): HeroCompositionAuthoringIssue[] {
  const issues: HeroCompositionAuthoringIssue[] = [];
  const add = (
    field: HeroCompositionAuthoringIssue["field"],
    code: HeroCompositionAuthoringIssue["code"],
    severity: HeroCompositionAuthoringIssue["severity"],
    conflict: string,
    recommendation: string,
  ) => issues.push({
    packageId: input.packageId,
    heroCompositionId: input.heroCompositionId,
    field,
    code,
    severity,
    conflict,
    recommendation,
  });

  for (const field of HERO_COMPOSITION_FRAME_FIELDS) {
    const value = input.fields[field];
    if (isMissing(value)) {
      add(field, "MISSING_FRAME_FIELD", "BLOCKER", `${field} is not explicitly authored.`, `Set a concrete positive ${field} target.`);
      continue;
    }
    if (value?.trim().toLowerCase() === "not_visible" && !allowsNotVisible(field, input.fields.framing)) {
      add(field, "INVALID_NOT_VISIBLE", "BLOCKER", `${field}=not_visible is not justified by the framing.`, `Author ${field} explicitly or use not_visible only when the crop truly hides it.`);
      continue;
    }
    if (VAGUE_VALUE_PATTERNS.some((pattern) => pattern.test(value ?? ""))) {
      add(field, "NON_POSITIVE_FRAME_VALUE", "BLOCKER", `${field} is vague or only prohibits reference copying.`, `Replace it with a concrete positive ${field} target.`);
    }
  }

  for (const kind of input.kinds) {
    if (kind === "portrait") continue;
    for (const field of REQUIRED_BY_KIND[kind]) {
      if (isMissing(input.fields[field])) {
        add(field, "MISSING_ANATOMY_FIELD", "BLOCKER", `${kind} requires ${field}.`, `Set an explicit ${field} for this ${kind} composition.`);
      }
    }
  }

  return deduplicateIssues(issues);
}

export function validateHeroCompositionPack(input: HeroCompositionPackInput): HeroCompositionAuthoringIssue[] {
  const issues: HeroCompositionAuthoringIssue[] = [];
  if (input.compositions.length < 2) return issues;

  const addVariationIssue = (conflict: string, recommendation: string) => {
    issues.push({
      packageId: input.packageId,
      heroCompositionId: "PACK",
      field: "pack_variation",
      code: "PACK_LACKS_VARIATION",
      severity: "NEEDS_UPDATE",
      conflict,
      recommendation,
    });
  };

  const normalized = (field: HeroCompositionField) => input.compositions.map((composition) =>
    composition.fields[field]?.trim().toLowerCase() ?? "",
  );
  const allSame = (values: readonly string[]) => values.every((value) => value.length > 0 && value === values[0]);

  const packVariationFields = ["expression", "gaze", "head_turn", "head_tilt", "hairstyle_arrangement", "hair_parting"] as const;
  const variationIsAuditable = input.compositions.every((composition) =>
    packVariationFields.every((field) => !isMissing(composition.fields[field])),
  );
  if (!variationIsAuditable) {
    issues.push({
      packageId: input.packageId,
      heroCompositionId: "PACK",
      field: "pack_variation",
      code: "PACK_VARIATION_UNVERIFIABLE",
      severity: "NEEDS_UPDATE",
      conflict: "Pack variation cannot be verified until every HC explicitly authors expression, gaze, head pose, hairstyle arrangement and parting.",
      recommendation: "Complete the required frame variables in every HC, then rerun pack-level validation.",
    });
  }

  for (const field of ["expression", "gaze"] as const) {
    if (allSame(normalized(field))) {
      addVariationIssue(`${field} is identical in every HC.`, `Vary ${field} positively in at least one HC.`);
    }
  }

  const headPoses = input.compositions.map((composition) => {
    const turn = composition.fields.head_turn?.trim().toLowerCase() ?? "";
    const tilt = composition.fields.head_tilt?.trim().toLowerCase() ?? "";
    return turn && tilt ? `${turn}|${tilt}` : "";
  });
  if (allSame(headPoses)) {
    addVariationIssue("head_turn + head_tilt is identical in every HC.", "Author at least two distinct head-pose combinations.");
  }

  const frameSignatures = input.compositions.map((composition) => {
    const values = HERO_COMPOSITION_FRAME_FIELDS.map((field) => composition.fields[field]?.trim().toLowerCase() ?? "");
    return values.every(Boolean) ? values.join("|") : "";
  });
  if (allSame(frameSignatures)) {
    addVariationIssue("Every HC has the same frame-variable set.", "Make at least two HC visibly different by expression + gaze + head pose.");
  }

  if (input.hairstylePolicy === "package_locked") {
    const target = input.packageHairstyleTarget?.trim() ?? "";
    if (!target || /\b(reference|persona)\b/i.test(target)) {
      issues.push({
        packageId: input.packageId,
        heroCompositionId: "PACK",
        field: "package_hairstyle_target",
        code: "PACKAGE_HAIRSTYLE_INHERITS_REFERENCE",
        severity: "BLOCKER",
        conflict: "The package-locked hairstyle has no independent positive target or inherits it from Persona references.",
        recommendation: "Define a concrete package hairstyle and parting independently from identity references.",
      });
    }
  }

  return deduplicateIssues(issues);
}

function deduplicateIssues(issues: readonly HeroCompositionAuthoringIssue[]): HeroCompositionAuthoringIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.heroCompositionId}:${issue.field}:${issue.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getHeroCompositionAuditStatus(
  issues: readonly HeroCompositionAuthoringIssue[],
): "BLOCKER" | "NEEDS_UPDATE" | "VALID" {
  if (issues.some((issue) => issue.severity === "BLOCKER")) return "BLOCKER";
  if (issues.length > 0) return "NEEDS_UPDATE";
  return "VALID";
}
