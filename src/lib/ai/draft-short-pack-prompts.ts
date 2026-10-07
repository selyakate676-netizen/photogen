export const DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT = 1 as const;

export type DraftShortNanoPackHeroComposition = Readonly<{
  heroCompositionId: `HC-00${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  name: string;
  prompt: string;
}>;

export type DraftShortNanoPackDefinition = Readonly<{
  packageId: `SP-0${32 | 33}`;
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
  referencePolicy: "synthetic-model-b";
  resolution: "1K";
  aspectRatio: "2:3";
  outputFormat: "jpg";
  previewModel: "Model B";
  previewSource: "/marketing/hero/group-2/source.png";
  jtbdCollectionIds: readonly string[];
  heroCompositions: readonly DraftShortNanoPackHeroComposition[];
}>;

const FACEKEEP =
  "СТРОГО сохранить лицо и индивидуальность 1:1 — черты, пропорции, возраст, естественный цвет и длину волос. Загруженная фотография задаёт только лицо и индивидуальность. Одежду, укладку и макияж заменить по описанию текущего кадра.";

const BIRTHDAY_PROJECTION_HC_001 =
  "Светлая минималистичная студийная фотосессия с мягким нейтральным фоном. На задней стене — очень крупная мягкая художественная проекция портрета этой же женщины. Основная фигура: женщина стоит на коленях на полу, сидя близко к пяткам. Корпус развернут почти в профиль, примерно на 60–75 градусов к камере. Спина естественно прямая, плечи расслаблены. Небольшой светлый торт она держит обеими руками перед собой примерно на уровне нижней части груди. На торте ровно одна тонкая зажжённая свеча без цифр и надписей. Голова слегка опущена к торту, взгляд направлен на пламя или глаза мягко прикрыты. Поза спокойная, элегантная и очень близкая к исходной композиции референса. Тёмно-коричневое облегающее длинное платье с длинным рукавом. Длинные тёмные волосы уложены мягкими волнами. Крупные золотые серьги. Натуральный вечерний макияж. Проекция: огромный крупный портрет этой же женщины занимает большую часть стены за основной фигурой. Это отдельный кадр той же фотосессии: лицо значительно крупнее, голова расположена иначе, выражение и направление взгляда отличаются от основной фигуры. Проекция может включать нижнюю часть торта и одну свечу, но НЕ повторяет позу основной фигуры. Никаких цифр и возрастных свечей. Вертикальная композиция 2:3. Основная фигура почти полностью помещается в кадр, проекция остаётся очень крупной и визуально доминирует на фоне, но лицо основной фигуры хорошо читается. 50mm, fine grain.";

const BIRTHDAY_PROJECTION_HC_002 =
  "Та же светлая минималистичная студия, тот же образ и та же большая художественная проекция портрета этой же женщины. Основная фигура: женщина сидит на полу в расслабленной диагональной позе, максимально близкой к исходному референсу. Обе ноги вытянуты в сторону и слегка согнуты. Корпус отклонён назад. Одной рукой женщина уверенно и естественно опирается ладонью на пол позади корпуса. На другой раскрытой ладони она держит небольшой светлый торт сбоку от тела примерно на уровне талии или нижней части груди. На торте одна тонкая зажжённая свеча без цифр и надписей. Голова слегка запрокинута и повернута, глаза закрыты или мягко прикрыты, выражение расслабленное и довольное. Поза должна выглядеть естественной и элегантной, а не постановочно сложной. Тёмно-коричневое облегающее длинное платье с длинным рукавом. Длинные тёмные волосы уложены мягкими волнами. Крупные золотые серьги. Натуральный вечерний макияж. Проекция: огромный портрет той же женщины по грудь или крупнее. В проекции корпус более вертикальный, голова находится в другом положении, взгляд может быть прямо в камеру. Проекция НЕ повторяет вытянутую сидячую позу основной фигуры. Если в проекции виден торт, он расположен иначе. Только одна свеча, никаких цифр. Вертикальный кадр 2:3. Основная фигура занимает нижнюю часть композиции по диагонали, а крупная проекция заполняет большую часть верхней и задней плоскости кадра. 50mm, fine grain.";


const DRAFT_SHORT_NANO_PACKS: readonly DraftShortNanoPackDefinition[] = [
  {
    packageId: "SP-032",
    styleId: "birthday-projection",
    slug: "birthday-projection",
    name: "День рождения с проекцией",
    photoCount: 2,
    status: "draft",
    catalogStatus: "inactive",
    contractTag: "nb2-facekeep-v1.1",
    formula: "NB2_FACEKEEP_V1.1_SHORT_WITH_WARM_EXPRESSION",
    provider: "google/nano-banana-2",
    referenceCount: DRAFT_SHORT_NANO_PACK_REFERENCE_COUNT,
    referencePolicy: "synthetic-model-b",
    resolution: "1K",
    aspectRatio: "2:3",
    outputFormat: "jpg",
    previewModel: "Model B",
    previewSource: "/marketing/hero/group-2/source.png",
    jtbdCollectionIds: ["events", "for-yourself", "social-lifestyle"],
    heroCompositions: [
      {
        heroCompositionId: "HC-001",
        name: "Projected Birthday Portrait",
        prompt: `${FACEKEEP}\n\n${BIRTHDAY_PROJECTION_HC_001}`,
      },
      {
        heroCompositionId: "HC-002",
        name: "Birthday Close Portrait",
        prompt: `${FACEKEEP}\n\n${BIRTHDAY_PROJECTION_HC_002}`,
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
