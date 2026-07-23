export type PhotoPackCategory = 'social' | 'dating' | 'business' | 'travel' | 'fashion' | 'lifestyle';


export type PhotoPack = {
  id: string;
  slug: string;
  title: string;
  description: string;
  summary: string;
  photos: number;
  price: string;
  category: PhotoPackCategory;
  categoryLabel: string;
  image: string;
  gallery: string[];
  suitableFor: string[];
  features: string[];
  deliverables: string[];
};

const sharedFeatures = [
  '20 профессиональных фото',
  '1-3 исходных селфи',
  'готово за несколько минут',
  'реалистичная обработка',
];

const basePhotoPacks: PhotoPack[] = [
  {
    id: 'career',
    slug: 'career',
    title: 'Бизнес-портрет',
    description: 'LinkedIn, резюме и рабочие профили',
    summary: 'Уверенная деловая фотосессия для LinkedIn, резюме, сайта компании и личного бренда.',
    photos: 20,
    price: '790 ₽',
    category: 'business',
    categoryLabel: 'Бизнес',
    image: '/career-woman-blazer.png',
    gallery: ['/career-woman-blazer.png', '/career-woman-1.png', '/career-woman-2.png', '/studio-white-suit.png'],
    suitableFor: ['LinkedIn', 'Резюме', 'Работа', 'Личный бренд', 'Сайт компании'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'По пояс', 'Рабочий кадр', 'Профиль'],
  },
  {
    id: 'dating',
    slug: 'dating',
    title: 'Знакомства',
    description: 'Притягательные фото для dating и соцсетей',
    summary: 'Живая, теплая серия для анкет знакомств, соцсетей и естественного первого впечатления.',
    photos: 20,
    price: '790 ₽',
    category: 'dating',
    categoryLabel: 'Свидания',
    image: '/package-previews/sp004-cozy-cafe.jpg',
    gallery: ['/package-previews/sp004-cozy-cafe.jpg', '/dating-woman-1.png', '/dating-woman-2.png', '/dating-woman-mirror.png'],
    suitableFor: ['Dating', 'Соцсети', 'Анкета', 'Личный бренд', 'Новые фото'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'Улыбка', 'Lifestyle', 'Анкета'],
  },
  {
    id: 'sup',
    slug: 'sup',
    title: 'SUP Editorial',
    description: 'Luxury editorial съемка на воде',
    summary: 'Кинематографичная серия на воде для отпуска, соцсетей и яркого lifestyle-образа.',
    photos: 20,
    price: '790 ₽',
    category: 'travel',
    categoryLabel: 'Путешествия',
    image: '/package-previews/sp005-sup-editorial.jpg',
    gallery: ['/package-previews/sp005-sup-editorial.jpg', '/package-previews/sp005-sup-editorial-board.jpg', '/package-previews/sp005-sup-editorial-lifestyle.jpg', '/studio-nature.png'],
    suitableFor: ['Путешествия', 'Соцсети', 'Лето', 'Lifestyle', 'Контент'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'На воде', 'Lifestyle', 'Широкий кадр'],
  },
  {
    id: 'studio-elegance',
    slug: 'studio-elegance',
    title: 'Studio Elegance',
    description: 'Теплая премиальная студийная серия',
    summary: 'Премиальная студийная фотосессия для портфолио, соцсетей и личного бренда.',
    photos: 20,
    price: '790 ₽',
    category: 'fashion',
    categoryLabel: 'Fashion',
    image: '/package-previews/sp006-studio-elegance.jpg',
    gallery: ['/package-previews/sp006-studio-elegance.jpg', '/studio-glamour.png', '/studio-fashion.png', '/studio-white-suit.png'],
    suitableFor: ['Портфолио', 'Соцсети', 'Личный бренд', 'Анкета', 'Подарок'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'По пояс', '3/4', 'Полный рост'],
  },
  {
    id: 'lakeside-walk',
    slug: 'lakeside-walk',
    title: 'Lakeside Walk',
    description: 'Романтичная прогулка у озера',
    summary: 'Мягкая прогулочная серия для соцсетей, знакомств и спокойного романтичного настроения.',
    photos: 20,
    price: '790 ₽',
    category: 'dating',
    categoryLabel: 'Свидания',
    image: '/package-previews/sp007-lakeside-walk.jpg',
    gallery: ['/package-previews/sp007-lakeside-walk.jpg', '/studio-nature.png', '/dating-woman-3.png', '/social-woman-2.png'],
    suitableFor: ['Dating', 'Прогулка', 'Соцсети', 'Личный архив', 'Lifestyle'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'Прогулка', 'Средний план', 'Lifestyle'],
  },
  {
    id: 'casual-park',
    slug: 'casual-park',
    title: 'Casual Park',
    description: 'Естественный quiet luxury в парке',
    summary: 'Естественная lifestyle-серия с дорогим, спокойным настроением для повседневного контента.',
    photos: 20,
    price: '790 ₽',
    category: 'lifestyle',
    categoryLabel: 'Lifestyle',
    image: '/package-previews/sp008-quiet-luxury-park.jpg',
    gallery: ['/package-previews/sp008-quiet-luxury-park.jpg', '/social-woman-1.png', '/social-woman-2.png', '/social-woman-cafe.png'],
    suitableFor: ['Lifestyle', 'Соцсети', 'Личный бренд', 'Контент', 'Профиль'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'Прогулка', 'Кафе', 'Город'],
  },
  {
    id: 'minimal-black-studio',
    slug: 'minimal-black-studio',
    title: 'Minimal Black Studio',
    description: 'Минималистичный студийный портрет',
    summary: 'Сдержанный студийный портрет с сильным контрастом для деловых и персональных профилей.',
    photos: 20,
    price: '790 ₽',
    category: 'business',
    categoryLabel: 'Бизнес',
    image: '/studio-bw-man.png',
    gallery: ['/studio-bw-man.png', '/career-man-1.png', '/career-man-editorial.png', '/ref-bw-blinds.png'],
    suitableFor: ['Профиль', 'Бизнес', 'Портфолио', 'Резюме', 'Личный бренд'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'Профиль', 'Черный фон', 'Editorial'],
  },
  {
    id: 'russian-editorial',
    slug: 'russian-editorial',
    title: 'Russian Editorial',
    description: 'Дизайнерский editorial с красным акцентом',
    summary: 'Выразительная fashion-серия с редакторским светом и акцентным настроением.',
    photos: 20,
    price: '790 ₽',
    category: 'fashion',
    categoryLabel: 'Fashion',
    image: '/studio-red-light-v2.png',
    gallery: ['/studio-red-light-v2.png', '/studio-glamour.png', '/ref-neon.png', '/studio-fashion.png'],
    suitableFor: ['Fashion', 'Портфолио', 'Обложка', 'Соцсети', 'Креатив'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'Editorial', 'Акцентный свет', 'Образ'],
  },
  {
    id: 'social',
    slug: 'social',
    title: 'Лайфстайл',
    description: 'Стильные городские образы на каждый день',
    summary: 'Городская серия для соцсетей, личного бренда и естественного визуального обновления.',
    photos: 20,
    price: '790 ₽',
    category: 'social',
    categoryLabel: 'Соцсети',
    image: '/social-woman-1.png',
    gallery: ['/social-woman-1.png', '/social-woman-2.png', '/social-woman-3.png', '/social-woman-car.png'],
    suitableFor: ['Соцсети', 'Профиль', 'Контент', 'Личный бренд', 'Lifestyle'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'Город', 'Кафе', 'Прогулка'],
  },
  {
    id: 'studio',
    slug: 'studio',
    title: 'Студийный свет',
    description: 'Профессиональное освещение и минимализм',
    summary: 'Чистая студийная серия с профессиональным светом для деловых и личных задач.',
    photos: 20,
    price: '790 ₽',
    category: 'business',
    categoryLabel: 'Бизнес',
    image: '/studio-white-suit.png',
    gallery: ['/studio-white-suit.png', '/career-woman-1.png', '/studio-stool-woman.png', '/career-woman-3.png'],
    suitableFor: ['Бизнес', 'Портфолио', 'Резюме', 'Соцсети', 'Личный бренд'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'По пояс', 'Полный рост', 'Профиль'],
  },
  {
    id: 'neon',
    slug: 'neon',
    title: 'Неон и Арт',
    description: 'Креативные образы с ярким светом',
    summary: 'Артовая серия с неоновым светом для яркого профиля, афиши или креативного портфолио.',
    photos: 20,
    price: '790 ₽',
    category: 'fashion',
    categoryLabel: 'Fashion',
    image: '/ref-neon.png',
    gallery: ['/ref-neon.png', '/studio-red-light-v2.png', '/ref-vintage.png', '/studio-fashion.png'],
    suitableFor: ['Креатив', 'Fashion', 'Соцсети', 'Портфолио', 'Афиша'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'Неон', 'Арт', 'Editorial'],
  },
  {
    id: 'bw',
    slug: 'bw',
    title: 'Черно-белое',
    description: 'Классическая эстетика и глубина',
    summary: 'Лаконичная черно-белая серия для портфолио, личного бренда и выразительного профиля.',
    photos: 20,
    price: '790 ₽',
    category: 'fashion',
    categoryLabel: 'Fashion',
    image: '/ref-bw-blinds.png',
    gallery: ['/ref-bw-blinds.png', '/studio-bw-man.png', '/studio-glamour.png', '/career-man-editorial.png'],
    suitableFor: ['Портфолио', 'Fashion', 'Профиль', 'Личный бренд', 'Классика'],
    features: sharedFeatures,
    deliverables: ['Портрет', 'Контраст', 'Editorial', 'Профиль'],
  },
];

const productionPackIds = new Set(['career', 'dating', 'social', 'studio', 'neon', 'bw']);

export const photoPacks: PhotoPack[] = basePhotoPacks.filter((pack) => productionPackIds.has(pack.id));
export function getPhotoPack(slug: string) {
  return photoPacks.find((pack) => pack.slug === slug || pack.id === slug);
}

export function getRelatedPhotoPacks(slug: string, limit = 6) {
  const current = getPhotoPack(slug);
  const pool = current
    ? photoPacks.filter((pack) => pack.id !== current.id).sort((left, right) => {
        if (left.category === current.category && right.category !== current.category) return -1;
        if (left.category !== current.category && right.category === current.category) return 1;
        return 0;
      })
    : photoPacks;

  return pool.slice(0, limit);
}