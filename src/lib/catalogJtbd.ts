export type CatalogJtbdCollection = {
  id: string;
  title: string;
  cardIds: readonly string[];
  chip?: { id: string; label: string; order: number };
};

const allActivePackIds = [
  'autumn-promenade', 'misty-morning', 'golden-field', 'black-minimalism',
  'scarlet-accent', 'turquoise-wave', 'pink-manifesto', 'make-a-wish',
  'first-impression', 'quiet-confidence', 'petersburg-walk-v2', 'golden-reflection',
  'scarlet-accent-2', 'autumn-lake', 'autumn-route', 'misty-cabin',
  'leaf-fall', 'autumn-warmth', 'red-square-autumn', 'monochrome-character',
] as const;

export const catalogJtbdCollections: readonly CatalogJtbdCollection[] = [
  {
    id: 'social-lifestyle',
    title: '\u0414\u043b\u044f \u0441\u043e\u0446\u0441\u0435\u0442\u0435\u0439 \u0438 lifestyle',
    chip: { id: 'social', label: '\u0421\u043e\u0446\u0441\u0435\u0442\u0438', order: 2 },
    cardIds: [
      'red-square-autumn', 'autumn-promenade', 'misty-morning', 'golden-field',
      'black-minimalism', 'scarlet-accent', 'turquoise-wave', 'pink-manifesto',
      'make-a-wish', 'first-impression', 'quiet-confidence', 'petersburg-walk-v2',
      'golden-reflection', 'scarlet-accent-2', 'autumn-lake', 'autumn-route',
      'misty-cabin', 'leaf-fall', 'autumn-warmth', 'monochrome-character',
    ],
  },
  {
    id: 'dating',
    title: '\u0414\u043b\u044f \u0437\u043d\u0430\u043a\u043e\u043c\u0441\u0442\u0432 \u0438 \u0430\u0432\u0430\u0442\u0430\u0440\u043a\u0438',
    chip: { id: 'dating', label: '\u0417\u043d\u0430\u043a\u043e\u043c\u0441\u0442\u0432\u0430', order: 3 },
    cardIds: [
      'first-impression', 'quiet-confidence', 'red-square-autumn',
      'autumn-promenade', 'golden-field', 'scarlet-accent',
      'pink-manifesto', 'golden-reflection', 'autumn-warmth',
    ],
  },
  {
    id: 'events',
    title: '\u041f\u0440\u0430\u0437\u0434\u043d\u0438\u043a\u0438 \u0438 \u0441\u043e\u0431\u044b\u0442\u0438\u044f',
    chip: { id: 'holiday', label: '\u041f\u0440\u0430\u0437\u0434\u043d\u0438\u043a\u0438', order: 5 },
    cardIds: ['make-a-wish'],
  },
  {
    id: 'work-brand',
    title: '\u041b\u0438\u0447\u043d\u044b\u0439 \u0431\u0440\u0435\u043d\u0434 \u0438 \u0440\u0430\u0431\u043e\u0442\u0430',
    chip: { id: 'work', label: '\u0420\u0430\u0431\u043e\u0442\u0430', order: 4 },
    cardIds: [
      'autumn-promenade', 'misty-morning', 'golden-field', 'black-minimalism',
      'scarlet-accent', 'pink-manifesto', 'first-impression', 'quiet-confidence',
      'petersburg-walk-v2', 'golden-reflection', 'scarlet-accent-2', 'autumn-lake',
      'misty-cabin', 'monochrome-character',
    ],
  },
  {
    id: 'walks-travel',
    title: '\u041f\u0440\u043e\u0433\u0443\u043b\u043a\u0438 \u0438 \u043f\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044f',
    cardIds: [
      'red-square-autumn', 'autumn-promenade', 'misty-morning', 'golden-field',
      'turquoise-wave', 'petersburg-walk-v2', 'autumn-lake', 'autumn-route',
      'misty-cabin', 'leaf-fall', 'autumn-warmth',
    ],
  },
  {
    id: 'art-studio',
    title: '\u0410\u0440\u0442 \u0438 \u0441\u0442\u0443\u0434\u0438\u0439\u043d\u044b\u0435',
    chip: { id: 'art', label: '\u0410\u0440\u0442 \u0438 \u0441\u0442\u0443\u0434\u0438\u044f', order: 6 },
    cardIds: [
      'black-minimalism', 'scarlet-accent', 'pink-manifesto',
      'golden-reflection', 'scarlet-accent-2', 'monochrome-character',
    ],
  },
  {
    id: 'family',
    title: '\u0421\u0435\u043c\u044c\u044f \u0438 \u0431\u043b\u0438\u0437\u043a\u0438\u0435',
    chip: { id: 'family', label: '\u0421\u0435\u043c\u044c\u044f', order: 7 },
    cardIds: ['make-a-wish', 'misty-cabin', 'autumn-lake', 'autumn-warmth'],
  },
  {
    id: 'style-refresh',
    title: '\u0421\u0442\u0438\u043b\u044c \u0438 \u043d\u043e\u0432\u044b\u0439 \u043e\u0431\u0440\u0430\u0437',
    cardIds: [
      'black-minimalism', 'scarlet-accent', 'pink-manifesto', 'first-impression',
      'quiet-confidence', 'golden-reflection', 'scarlet-accent-2', 'monochrome-character',
    ],
  },
  {
    id: 'for-yourself',
    title: '\u0414\u043b\u044f \u0441\u0435\u0431\u044f',
    cardIds: [
      'autumn-promenade', 'misty-morning', 'golden-field', 'turquoise-wave',
      'make-a-wish', 'autumn-lake', 'autumn-route', 'misty-cabin',
      'leaf-fall', 'autumn-warmth', 'red-square-autumn',
    ],
  },
];

export const catalogQuickFilters = [
  { id: 'all', label: '\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e\u0435', cardIds: allActivePackIds },
  { id: 'new', label: '\u041d\u043e\u0432\u0438\u043d\u043a\u0438', cardIds: allActivePackIds },
  ...catalogJtbdCollections
    .filter((collection) => collection.chip)
    .sort((left, right) => left.chip!.order - right.chip!.order)
    .map((collection) => ({
      id: collection.chip!.id,
      label: collection.chip!.label,
      cardIds: collection.cardIds,
    })),
];

export type CatalogQuickFilterId = (typeof catalogQuickFilters)[number]['id'];
