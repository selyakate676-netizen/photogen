export type MarketingImageSlot = {
  slot: string;
  src: string;
  replacementPath: string;
  alt: string;
};

export type HeroVisualGroup = {
  id: string;
  persona: string;
  source: MarketingImageSlot;
  results: readonly [MarketingImageSlot, MarketingImageSlot, MarketingImageSlot, MarketingImageSlot];
};

const modelASource = '/marketing/hero/group-1/source.png';
const modelAResults = [
  '/marketing/hero/group-1/result-1.webp',
  '/marketing/hero/group-1/result-2.webp',
  '/marketing/hero/group-1/result-3.webp',
  '/marketing/hero/group-1/result-4.webp',
] as const;

const modelBSource = '/marketing/hero/group-2/source.png';
const modelBResults = [
  '/marketing/hero/group-2/result-1.webp',
  '/marketing/hero/group-2/result-2.webp',
  '/marketing/hero/group-2/result-3.webp',
  '/marketing/hero/group-2/result-4.webp',
] as const;

const modelCSource = '/marketing/hero/group-3/source.png';
const modelCResults = [
  '/marketing/hero/group-3/result-1.webp',
  '/marketing/hero/group-3/result-2.webp',
  '/marketing/hero/group-3/result-3.webp',
  '/marketing/hero/group-3/result-4.webp',
] as const;

function resultSlot(group: 1 | 2 | 3, index: 0 | 1 | 2 | 3): MarketingImageSlot {
  const results = group === 1 ? modelAResults : group === 2 ? modelBResults : modelCResults;

  return {
    slot: `Hero group ${group} / result ${index + 1}`,
    src: results[index],
    replacementPath: results[index],
    alt: `Результат AI-фотосессии ${index + 1}, группа ${group}`,
  };
}
function heroGroup(group: 1 | 2 | 3): HeroVisualGroup {
  const source = group === 1 ? modelASource : group === 2 ? modelBSource : modelCSource;
  const persona = group === 1 ? 'Model A' : group === 2 ? 'Model B' : 'Model C';

  return {
    id: `hero-group-${group}`,
    persona,
    source: {
      slot: `Hero group ${group} / source`,
      src: source,
      replacementPath: source,
      alt: `Обычное исходное фото, группа ${group}`,
    },
    results: [
      resultSlot(group, 0),
      resultSlot(group, 1),
      resultSlot(group, 2),
      resultSlot(group, 3),
    ],
  };
}

// All three Hero groups use approved persona-matched assets.
export const heroVisualGroups = [heroGroup(1), heroGroup(2), heroGroup(3)] as const;

export const howItWorksVisuals = [
  {
    slot: 'HowItWorks / step 1 / natural selfie',
    src: '/selfie-2.png',
    replacementPath: '/marketing/how-it-works/step-1-source.jpg',
    alt: 'Обычное селфи пользователя в начале пути',
  },
  {
    slot: 'HowItWorks / step 2 / persona reference',
    src: '/before-main.png',
    replacementPath: '/marketing/how-it-works/step-2-persona.jpg',
    alt: 'Чёткое исходное фото лица для создания профиля',
  },
  {
    slot: 'HowItWorks / step 3 / generated result',
    src: '/package-previews/sp006-studio-elegance.jpg',
    replacementPath: '/marketing/how-it-works/step-3-result.jpg',
    alt: 'Готовый результат AI-фотосессии PhotoGen',
  },
] as const satisfies readonly MarketingImageSlot[];