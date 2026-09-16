export const DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT = 1 as const;

export type DraftShortNanoPackHeroComposition = Readonly<{
  heroCompositionId: `HC-00${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  name: string;
  prompt: string;
}>;

export type DraftShortNanoPackDefinition = Readonly<{
  packageId: `SP-0${14 | 17 | 18 | 20 | 21}`;
  styleId: string;
  name: string;
  status: "draft";
  catalogStatus: "inactive";
  formula: "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION";
  heroCompositions: readonly DraftShortNanoPackHeroComposition[];
}>;

const FACEKEEP =
  "СТРОГО сохранить лицо и индивидуальность 1:1 — черты, пропорции, возраст, естественный цвет и длину волос. Загруженная фотография задаёт только лицо и индивидуальность. Одежду, укладку и макияж заменить по описанию текущего кадра.";

const DRAFT_SHORT_NANO_PACKS: readonly DraftShortNanoPackDefinition[] = [


];

export function getDraftShortNanoPackDefinition(
  styleId: string,
): DraftShortNanoPackDefinition | undefined {
  return DRAFT_SHORT_NANO_PACKS.find(
    (pack) => pack.styleId === styleId || pack.packageId === styleId,
  );
}

export const draftShortNanoPackDefinitions = DRAFT_SHORT_NANO_PACKS;
