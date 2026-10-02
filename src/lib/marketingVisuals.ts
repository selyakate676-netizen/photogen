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

const fallbackSource = '/selfie-2.png';
const fallbackResults = [
  '/studio-glamour.png',
  '/studio-fashion.png',
  '/studio-nature.png',
  '/studio-red-light-v2.png',
] as const;

const modelASource = '/marketing/hero/group-1/source.png';
const modelAResults = [
  '/marketing/hero/group-1/result-1.webp',
  '/marketing/hero/group-1/result-2.webp',
  '/marketing/hero/group-1/result-3.webp',
  '/marketing/hero/group-1/result-4.webp',
] as const;

function resultSlot(group: 1 | 2 | 3, index: 0 | 1 | 2 | 3): MarketingImageSlot {
  return {
    slot: `Hero group ${group} / result ${index + 1}`,
    src: group === 1 ? modelAResults[index] : fallbackResults[index],
    replacementPath: group === 1 ? modelAResults[index] : `/marketing/hero/group-${group}/result-${index + 1}.jpg`,
    alt: `Результат AI-фотосессии ${index + 1}, группа ${group}`,
  };
}
function heroGroup(group: 1 | 2 | 3): HeroVisualGroup {
  return {
    id: `hero-group-${group}`,
    persona: group === 1 ? 'Model A' : `Persona ${group} — temporary fallback`,
    source: {
      slot: `Hero group ${group} / source`,
      src: group === 1 ? modelASource : fallbackSource,
      replacementPath: group === 1 ? modelASource : `/marketing/hero/group-${group}/source.jpg`,
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

// Group 1 uses approved Model A assets. Groups 2-3 keep the current production
// visual as a fallback until all five files for each persona are approved.
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