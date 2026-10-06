export const DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT = 1 as const;

export type DraftShortNanoPackHeroComposition = Readonly<{
  heroCompositionId: `HC-00${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  name: string;
  prompt: string;
}>;

export type DraftShortNanoPackDefinition = Readonly<{
  packageId: `SP-0${14 | 17 | 18 | 20 | 21 | 31}`;
  styleId: string;
  slug: string;
  name: string;
  photoCount: number;
  status: "draft";
  catalogStatus: "inactive";
  contractTag: "nb2-facekeep-v1.1";
  formula: "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION";
  provider: "google/nano-banana-2";
  referenceCount: 1;
  referencePolicy: "first-frontal-persona-photo";
  resolution: "1K";
  aspectRatio: "2:3";
  outputFormat: "jpg";
  previewModel: "Model B";
  jtbdCollectionIds: readonly string[];
  heroCompositions: readonly DraftShortNanoPackHeroComposition[];
}>;

const FACEKEEP =
  "СТРОГО сохранить лицо и индивидуальность 1:1 — черты, пропорции, возраст, естественный цвет и длину волос. Загруженная фотография задаёт только лицо и индивидуальность. Одежду, укладку и макияж заменить по описанию текущего кадра.";

const FLOWERS_SERIES =
  "Светлая премиальная студийная фотосессия с чистым нейтральным фоном и светлым полом, мягкий естественный дневной свет без жёстких цветных источников. Свободная белая рубашка без жакета, минималистичный styling. Тёмные волосы уложены одинаковыми мягкими объёмными распущенными волнами. Одинаковый polished natural makeup: ровный естественный тон, мягкий розовый blush, аккуратно подчёркнутые глаза, натуральные розово-nude губы. Большой пышный букет нежно-розовых пионов. Женственное, мягкое, праздничное premium-editorial настроение без гламура и китча.";

const DRAFT_SHORT_NANO_PACKS: readonly DraftShortNanoPackDefinition[] = [
  {
    packageId: "SP-031",
    styleId: "flowers",
    slug: "flowers",
    name: "Цветы",
    photoCount: 3,
    status: "draft",
    catalogStatus: "inactive",
    contractTag: "nb2-facekeep-v1.1",
    formula: "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION",
    provider: "google/nano-banana-2",
    referenceCount: DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT,
    referencePolicy: "first-frontal-persona-photo",
    resolution: "1K",
    aspectRatio: "2:3",
    outputFormat: "jpg",
    previewModel: "Model B",
    jtbdCollectionIds: ["events", "for-yourself", "social-lifestyle"],
    heroCompositions: [
      {
        heroCompositionId: "HC-001",
        name: "Floor Seated Hero",
        prompt: `${FACEKEEP}\n\n${FLOWERS_SERIES} Фотореалистичный вертикальный портрет 2:3 в три четверти. Женщина сидит на светлом студийном полу, ноги естественно согнуты, корпус спокойно направлен к камере. Большой букет пионов расположен перед ней и частично лежит на коленях, не конкурируя с лицом. Лицо открыто, взгляд прямой или почти прямой, мягкая спокойная полуулыбка. Руки поддерживают букет простым физически правдоподобным способом без сложных пересечений. Кадр примерно от головы до голеней, 50mm, fine grain.`,
      },
      {
        heroCompositionId: "HC-002",
        name: "Close Portrait with Peonies",
        prompt: `${FACEKEEP}\n\n${FLOWERS_SERIES} Фотореалистичный вертикальный крупный portrait по грудь. Женщина мягко прижимает большой букет нежно-розовых пионов к груди; часть цветов находится рядом с нижней частью лица, но не закрывает глаза, нос и основные черты. Лицо доминирует в композиции и показано достаточно крупно, волосы не перекрывают его. Мягкий прямой взгляд и естественная лёгкая улыбка. Руки находятся ниже основной зоны лица и спокойно удерживают букет. Flattering facial light, 85mm, f/2.0, fine grain.`,
      },
      {
        heroCompositionId: "HC-003",
        name: "Chair Portrait",
        prompt: `${FACEKEEP}\n\n${FLOWERS_SERIES} Фотореалистичный вертикальный seated portrait в три четверти. Женщина сидит боком на простом деревянном стуле, корпус мягко развёрнут обратно к камере. Большой букет розовых пионов устойчиво лежит на руках и коленях. Одна простая физически правдоподобная поза без экстремального поворота шеи. Спокойный уверенный взгляд в камеру, мягкая естественная полуулыбка. Стул визуально вторичен, лицо открыто, кадр примерно от головы до колен, 50mm, fine grain.`,
      },
    ],
  },
];

export function getDraftShortNanoPackDefinition(
  styleId: string,
): DraftShortNanoPackDefinition | undefined {
  return DRAFT_SHORT_NANO_PACKS.find(
    (pack) => pack.styleId === styleId || pack.packageId === styleId,
  );
}

export const draftShortNanoPackDefinitions = DRAFT_SHORT_NANO_PACKS;
