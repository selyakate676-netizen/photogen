'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Gem } from 'lucide-react';
import PhotoPackModal from '@/components/PhotoPackModal';
import { getPhotoPack, photoPacks } from '@/lib/photoPacks';
import styles from './CatalogSection.module.css';

type Category = 'all' | 'social' | 'dating' | 'business' | 'travel' | 'fashion' | 'lifestyle';
type FilterId = Category | 'women' | 'men' | 'family' | 'holiday' | 'creative' | 'sport' | 'new';

type CatalogCard = {
  id: string;
  title: string;
  description: string;
  photos: number;
  priceRub?: number;
  priceCrystals?: number;
  category: Exclude<Category, 'all'>;
  categoryLabel: string;
  image: string;
  real?: boolean;
};

type CatalogSectionProps = {
  standalone?: boolean;
};

type Collection = {
  id: string;
  title: string;
  category?: Exclude<Category, 'all'>;
  cardIds: string[];
};

const labels = {
  popular: '\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e\u0435',
  social: '\u0421\u043e\u0446\u0441\u0435\u0442\u0438',
  work: '\u0420\u0430\u0431\u043e\u0442\u0430',
  dating: '\u0417\u043d\u0430\u043a\u043e\u043c\u0441\u0442\u0432\u0430',
  travel: '\u041f\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044f',
  business: '\u0411\u0438\u0437\u043d\u0435\u0441',
  fashion: 'Fashion',
  lifestyle: 'Lifestyle',
  photo: '\u0444\u043e\u0442\u043e',
  catalog: '\u041a\u0430\u0442\u0430\u043b\u043e\u0433',
  subtitle: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0442\u0438\u043b\u044c \u0434\u043b\u044f \u043b\u044e\u0431\u043e\u0439 \u0437\u0430\u0434\u0430\u0447\u0438.',
  searchPlaceholder: '\u041f\u043e\u0438\u0441\u043a \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438...',
  controlsLabel: '\u041f\u043e\u0438\u0441\u043a \u0438 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438',
  filtersLabel: '\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430',
  collectionsLabel: '\u041a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u0438 \u0441\u0442\u0438\u043b\u0435\u0439',
  empty: '\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0448\u043b\u0438. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043e\u0439 \u0437\u0430\u043f\u0440\u043e\u0441 \u0438\u043b\u0438 \u0444\u0438\u043b\u044c\u0442\u0440.',
  scrollPrev: '\u041f\u0440\u043e\u043a\u0440\u0443\u0442\u0438\u0442\u044c \u043a\u0430\u0440\u0443\u0441\u0435\u043b\u044c \u0432\u043b\u0435\u0432\u043e',
  scrollNext: '\u041f\u0440\u043e\u043a\u0440\u0443\u0442\u0438\u0442\u044c \u043a\u0430\u0440\u0443\u0441\u0435\u043b\u044c \u0432\u043f\u0440\u0430\u0432\u043e',
  showAll: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
  hideAll: '\u0421\u043a\u0440\u044b\u0442\u044c \u0432\u0441\u0435 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
  allPhotoshoots: '\u0412\u0441\u0435 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
  nothingFound: '\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e',
  noCategoryItems: '\u0412 \u044d\u0442\u043e\u0439 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0439',
  searchResults: '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043f\u043e\u0438\u0441\u043a\u0430',
  suggestionsTitle: '\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u044b\u0435 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
  searchAria: '\u041f\u043e\u0438\u0441\u043a \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
  soon: '\u0421\u043a\u043e\u0440\u043e',
};

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: labels.popular },
  { id: 'social', label: labels.social },
  { id: 'business', label: labels.work },
  { id: 'dating', label: labels.dating },
  { id: 'travel', label: labels.travel },
  { id: 'fashion', label: labels.fashion },
  { id: 'lifestyle', label: labels.lifestyle },
  { id: 'women', label: '\u0414\u043b\u044f \u0436\u0435\u043d\u0449\u0438\u043d' },
  { id: 'men', label: '\u0414\u043b\u044f \u043c\u0443\u0436\u0447\u0438\u043d' },
  { id: 'family', label: '\u0421\u0435\u043c\u0435\u0439\u043d\u044b\u0435' },
  { id: 'holiday', label: '\u041f\u0440\u0430\u0437\u0434\u043d\u0438\u043a\u0438' },
  { id: 'creative', label: '\u041a\u0440\u0435\u0430\u0442\u0438\u0432' },
  { id: 'sport', label: '\u0421\u043f\u043e\u0440\u0442' },
  { id: 'new', label: '\u041d\u043e\u0432\u0438\u043d\u043a\u0438' },
];

const realCards: CatalogCard[] = photoPacks.map((pack) => ({
  id: pack.slug,
  title: pack.title,
  description: pack.description,
  photos: pack.photos,
  priceRub: pack.priceRub,
  priceCrystals: pack.priceCrystals,
  category: pack.category,
  categoryLabel: pack.categoryLabel,
  image: pack.image,
  real: true,
}));
const placeholderCards: CatalogCard[] = [
  ['old-money', 'Old Money', 'Quiet luxury \u0438 \u0441\u0434\u0435\u0440\u0436\u0430\u043d\u043d\u044b\u0439 \u043f\u0440\u0435\u043c\u0438\u0443\u043c', 'fashion', labels.fashion, '/ref-golden.png'],
  ['wedding', 'Wedding', '\u041d\u0435\u0436\u043d\u0430\u044f \u0441\u0432\u0430\u0434\u0435\u0431\u043d\u0430\u044f \u0441\u0435\u0440\u0438\u044f', 'dating', '\u0421\u0432\u0438\u0434\u0430\u043d\u0438\u044f', '/dating-woman-1.png'],
  ['fashion-editorial', 'Fashion Editorial', '\u041e\u0431\u043b\u043e\u0436\u043a\u0430 \u043c\u043e\u0434\u043d\u043e\u0433\u043e \u0436\u0443\u0440\u043d\u0430\u043b\u0430', 'fashion', labels.fashion, '/studio-fashion.png'],
  ['linkedin-pro', 'LinkedIn Pro', '\u0423\u0432\u0435\u0440\u0435\u043d\u043d\u044b\u0439 \u0434\u0435\u043b\u043e\u0432\u043e\u0439 \u043f\u043e\u0440\u0442\u0440\u0435\u0442', 'business', labels.business, '/career-woman-1.png'],
  ['street-style', 'Street Style', '\u0413\u043e\u0440\u043e\u0434\u0441\u043a\u0430\u044f \u0441\u0435\u0440\u0438\u044f \u0434\u043b\u044f \u043b\u0435\u043d\u0442\u044b', 'social', labels.social, '/social-woman-car.png'],
  ['ceo-portrait', 'CEO Portrait', '\u0421\u0442\u0440\u043e\u0433\u0438\u0439 \u0438 \u0434\u043e\u0440\u043e\u0433\u043e\u0439 \u0431\u0438\u0437\u043d\u0435\u0441-\u043a\u0430\u0434\u0440', 'business', labels.business, '/career-man-1.png'],
  ['coffee-shop', 'Coffee Shop', '\u0422\u0435\u043f\u043b\u044b\u0439 lifestyle \u0432 \u043a\u0430\u0444\u0435', 'lifestyle', labels.lifestyle, '/social-woman-cafe.png'],
  ['autumn-walk', 'Autumn Walk', '\u041f\u0440\u043e\u0433\u0443\u043b\u043a\u0430 \u0432 \u0437\u043e\u043b\u043e\u0442\u043e\u043c \u0441\u0432\u0435\u0442\u0435', 'lifestyle', labels.lifestyle, '/studio-nature.png'],
  ['summer-linen', 'Summer Linen', '\u041b\u0435\u0433\u043a\u0438\u0435 \u043b\u0435\u0442\u043d\u0438\u0435 \u043e\u0431\u0440\u0430\u0437\u044b', 'travel', labels.travel, '/package-previews/sp005-sup-editorial-lifestyle.jpg'],
  ['luxury-hotel', 'Luxury Hotel', '\u0424\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u044f \u0432 \u0430\u0442\u043c\u043e\u0441\u0444\u0435\u0440\u0435 \u043e\u0442\u0435\u043b\u044f', 'travel', labels.travel, '/review-avatar-1.png'],
  ['black-white', 'Black & White', '\u041a\u043e\u043d\u0442\u0440\u0430\u0441\u0442\u043d\u0430\u044f \u0447\u0435\u0440\u043d\u043e-\u0431\u0435\u043b\u0430\u044f \u0441\u0435\u0440\u0438\u044f', 'fashion', labels.fashion, '/studio-bw-man.png'],
  ['vacation', 'Vacation', '\u0421\u0432\u043e\u0431\u043e\u0434\u043d\u044b\u0435 \u043a\u0430\u0434\u0440\u044b \u0438\u0437 \u043e\u0442\u043f\u0443\u0441\u043a\u0430', 'travel', labels.travel, '/package-previews/sp005-sup-editorial-board.jpg'],
  ['fitness', 'Fitness', '\u0421\u043f\u043e\u0440\u0442\u0438\u0432\u043d\u0430\u044f \u0441\u0435\u0440\u0438\u044f \u0441 \u044d\u043d\u0435\u0440\u0433\u0438\u0435\u0439', 'lifestyle', labels.lifestyle, '/dating-man-outdoor.png'],
  ['creative-studio', 'Creative Studio', '\u041d\u0435\u043e\u0431\u044b\u0447\u043d\u044b\u0439 \u0441\u0432\u0435\u0442 \u0438 \u0440\u0430\u043a\u0443\u0440\u0441\u044b', 'fashion', labels.fashion, '/studio-red-light-v2.png'],
  ['paris-morning', 'Paris Morning', '\u0421\u043f\u043e\u043a\u043e\u0439\u043d\u044b\u0439 \u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 editorial', 'travel', labels.travel, '/review-avatar-2.png'],
  ['night-city', 'Night City', '\u0412\u0435\u0447\u0435\u0440\u043d\u0438\u0439 \u0433\u043e\u0440\u043e\u0434 \u0438 \u0441\u0438\u043d\u0435\u043c\u0430\u0442\u0438\u0447\u043d\u044b\u0439 \u0441\u0432\u0435\u0442', 'social', labels.social, '/ref-neon.png'],
  ['magazine-cover', 'Magazine Cover', '\u041a\u0430\u0434\u0440\u044b \u043a\u0430\u043a \u0434\u043b\u044f \u043e\u0431\u043b\u043e\u0436\u043a\u0438', 'fashion', labels.fashion, '/studio-glamour.png'],
  ['casual-lifestyle', 'Casual Lifestyle', '\u0416\u0438\u0432\u044b\u0435 \u043a\u0430\u0434\u0440\u044b \u043d\u0430 \u043a\u0430\u0436\u0434\u044b\u0439 \u0434\u0435\u043d\u044c', 'lifestyle', labels.lifestyle, '/social-woman-2.png'],
  ['art-gallery', 'Art Gallery', '\u0421\u043f\u043e\u043a\u043e\u0439\u043d\u044b\u0439 \u0430\u0440\u0442-\u043a\u0430\u0434\u0440 \u0434\u043b\u044f \u043b\u0438\u0447\u043d\u043e\u0433\u043e \u0431\u0440\u0435\u043d\u0434\u0430', 'social', labels.social, '/studio-stool-woman.png'],
  ['winter-mood', 'Winter Mood', '\u0423\u044e\u0442\u043d\u0430\u044f \u0437\u0438\u043c\u043d\u044f\u044f \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u044f', 'lifestyle', labels.lifestyle, '/review-avatar-3.png'],
  ['business-travel', 'Business Travel', '\u0414\u0435\u043b\u043e\u0432\u0430\u044f \u043f\u043e\u0435\u0437\u0434\u043a\u0430 \u0438 \u043e\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0441\u0442\u0438\u043b\u044c', 'business', labels.business, '/career-woman-2.png'],
  ['date-night', 'Date Night', '\u0412\u0435\u0447\u0435\u0440\u043d\u0438\u0439 \u043e\u0431\u0440\u0430\u0437 \u0434\u043b\u044f \u0430\u043d\u043a\u0435\u0442\u044b', 'dating', '\u0421\u0432\u0438\u0434\u0430\u043d\u0438\u044f', '/dating-woman-2.png'],
].map(([id, title, description, category, categoryLabel, image]) => ({
  id,
  title,
  description,
  category: category as CatalogCard['category'],
  categoryLabel,
  image,
  photos: 20,
}));

const catalogCards = [...realCards, ...placeholderCards];

const collections: Collection[] = [
  { id: 'popular', title: labels.popular, cardIds: ['career', 'dating', 'studio-elegance', 'social', 'old-money', 'lakeside-walk', 'fashion-editorial'] },
  { id: 'social-row', title: labels.social, category: 'social', cardIds: ['social', 'street-style', 'night-city', 'art-gallery', 'casual-lifestyle', 'dating', 'coffee-shop'] },
  { id: 'work', title: '\u0414\u043b\u044f \u0440\u0430\u0431\u043e\u0442\u044b', category: 'business', cardIds: ['career', 'minimal-black-studio', 'studio', 'linkedin-pro', 'ceo-portrait', 'business-travel', 'studio-elegance'] },
  { id: 'dating-row', title: '\u0414\u043b\u044f \u0437\u043d\u0430\u043a\u043e\u043c\u0441\u0442\u0432', category: 'dating', cardIds: ['dating', 'lakeside-walk', 'wedding', 'date-night', 'coffee-shop', 'old-money'] },
  { id: 'travel-row', title: labels.travel, category: 'travel', cardIds: ['sup', 'lakeside-walk', 'summer-linen', 'luxury-hotel', 'vacation', 'paris-morning'] },
  { id: 'fashion-row', title: labels.fashion, category: 'fashion', cardIds: ['studio-elegance', 'russian-editorial', 'neon', 'bw', 'old-money', 'fashion-editorial', 'magazine-cover', 'creative-studio'] },
  { id: 'lifestyle-row', title: labels.lifestyle, category: 'lifestyle', cardIds: ['casual-park', 'social', 'coffee-shop', 'autumn-walk', 'casual-lifestyle', 'fitness', 'winter-mood'] },
];


const filterCardIds: Partial<Record<FilterId, string[]>> = {
  women: ['dating', 'studio-elegance', 'lakeside-walk', 'casual-park', 'social', 'wedding', 'old-money', 'coffee-shop', 'autumn-walk', 'date-night'],
  men: ['minimal-black-studio', 'ceo-portrait', 'fitness', 'business-travel', 'black-white'],
  family: ['wedding', 'casual-park', 'winter-mood', 'coffee-shop'],
  holiday: ['wedding', 'luxury-hotel', 'winter-mood', 'date-night'],
  creative: ['neon', 'russian-editorial', 'creative-studio', 'magazine-cover', 'art-gallery', 'night-city'],
  sport: ['fitness', 'sup', 'vacation'],
  new: ['studio-elegance', 'lakeside-walk', 'casual-park', 'sup', 'russian-editorial', 'social'],
};
function matchesSearch(card: CatalogCard, query: string) {
  const haystack = `${card.title} ${card.description} ${card.categoryLabel}`.toLowerCase();
  return haystack.includes(query.toLowerCase().trim());
}

function Card({ card, onOpen }: { card: CatalogCard; onOpen: (card: CatalogCard, trigger: HTMLElement) => void }) {
  const content = (
    <>
      <div className={styles.coverWrap}>
        <Image src={card.image} alt="" fill className={styles.cover} sizes="(max-width: 768px) 52vw, 22vw" />
      </div>
      <div className={styles.cardBody}>
        <h3>{card.title}</h3>
        <p>{card.description}</p>
        <div className={styles.cardMeta}>
          <span>{card.photos} {labels.photo}</span>
          {card.real && card.priceRub && card.priceCrystals ? (
            <span className={styles.cardPrices}>
              <strong>{card.priceRub} {'\u20bd'}</strong>
              <em><Gem aria-hidden="true" /> {card.priceCrystals}</em>
            </span>
          ) : null}
        </div>      </div>
    </>
  );

  if (!card.real) {
    return <article className={`${styles.card} ${styles.placeholderCard}`}>{content}</article>;
  }

  return (
    <button type="button" className={`${styles.card} ${styles.realCard}`} onClick={(event) => onOpen(card, event.currentTarget)}>
      {content}
    </button>
  );
}


function matchesFilter(card: CatalogCard, activeFilter: FilterId) {
  if (activeFilter === 'all') {
    return true;
  }

  const cardIds = filterCardIds[activeFilter];
  if (cardIds) {
    return cardIds.includes(card.id);
  }

  return card.category === activeFilter;
}

function CarouselRow({ collection, cards, onOpenPack }: { collection: Collection; cards: CatalogCard[]; onOpenPack: (card: CatalogCard, trigger: HTMLElement) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setCanScrollPrev(rail.scrollLeft > 8);
    setCanScrollNext(rail.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    rail.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      rail.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [cards.length, updateScrollState]);

  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.78, 280), behavior: 'smooth' });
  };

  return (
    <section className={styles.collection}>
      <div className={styles.collectionHeader}>
        <h3>{collection.title}</h3>
      </div>
      <div
        className={styles.railFrame}
        data-can-prev={canScrollPrev}
        data-can-next={canScrollNext}
      >
        <button
          type="button"
          className={`${styles.railButton} ${styles.railButtonPrev}`}
          onClick={() => scrollRail(-1)}
          disabled={!canScrollPrev}
          aria-label={labels.scrollPrev}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className={styles.rail} ref={railRef}>
          {cards.map((card) => (
            <Card key={`${collection.id}-${card.id}`} card={card} onOpen={onOpenPack} />
          ))}
        </div>
        <button
          type="button"
          className={`${styles.railButton} ${styles.railButtonNext}`}
          onClick={() => scrollRail(1)}
          disabled={!canScrollNext}
          aria-label={labels.scrollNext}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
export default function CatalogSection({ standalone = false }: CatalogSectionProps) {
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const filterRailRef = useRef<HTMLDivElement>(null);
  const filterButtonRefs = useRef(new Map<FilterId, HTMLButtonElement>());
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [showAllPhotoshoots, setShowAllPhotoshoots] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [canScrollFiltersPrev, setCanScrollFiltersPrev] = useState(false);
  const [canScrollFiltersNext, setCanScrollFiltersNext] = useState(false);
  const [selectedPackSlug, setSelectedPackSlug] = useState<string | null>(null);
  const modalTriggerRef = useRef<HTMLElement | null>(null);

  const cardsById = useMemo(() => {
    return new Map(catalogCards.map((card) => [card.id, card]));
  }, []);

  const activeFilterLabel = useMemo(() => {
    return filters.find((filter) => filter.id === activeFilter)?.label ?? labels.popular;
  }, [activeFilter]);

  const resultCards = useMemo(() => {
    const uniqueCards = new Map<string, CatalogCard>();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      catalogCards
        .filter((card) => matchesSearch(card, trimmedQuery))
        .forEach((card) => uniqueCards.set(card.id, card));

      return Array.from(uniqueCards.values());
    }

    if (activeFilter === 'all') {
      const popularCollection = collections.find((collection) => collection.id === 'popular');
      popularCollection?.cardIds
        .map((id) => cardsById.get(id))
        .filter((card): card is CatalogCard => Boolean(card))
        .forEach((card) => uniqueCards.set(card.id, card));

      return Array.from(uniqueCards.values());
    }

    catalogCards
      .filter((card) => matchesFilter(card, activeFilter))
      .forEach((card) => uniqueCards.set(card.id, card));

    return Array.from(uniqueCards.values());
  }, [activeFilter, cardsById, query]);

  const resultCollection = useMemo(() => {
    return {
      id: query.trim() ? 'search-results' : `filter-${activeFilter}`,
      title: query.trim() ? labels.searchResults : activeFilterLabel,
      cardIds: resultCards.map((card) => card.id),
    } satisfies Collection;
  }, [activeFilter, activeFilterLabel, query, resultCards]);

  const visibleCollections = useMemo(() => {
    if (activeFilter !== 'all' || query.trim()) {
      return [];
    }

    return collections
      .map((collection) => ({
        ...collection,
        cards: collection.cardIds
          .map((id) => cardsById.get(id))
          .filter((card): card is CatalogCard => Boolean(card)),
      }))
      .filter((collection) => collection.cards.length > 0);
  }, [activeFilter, cardsById, query]);

  const fullCatalogCards = useMemo(() => {
    const uniqueCards = new Map<string, CatalogCard>();
    catalogCards.forEach((card) => uniqueCards.set(card.id, card));
    return Array.from(uniqueCards.values());
  }, []);

  const searchSuggestions = useMemo(() => {
    return catalogCards.filter((card) => matchesSearch(card, query)).slice(0, 10);
  }, [query]);

  const activeSuggestion = searchSuggestions[activeSuggestionIndex];

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setActiveSuggestionIndex(0);
  }, []);
  const selectedPack = useMemo(() => {
    return selectedPackSlug ? getPhotoPack(selectedPackSlug) : undefined;
  }, [selectedPackSlug]);

  const openPackModal = useCallback((card: CatalogCard, trigger?: HTMLElement | null) => {
    if (!card.real) {
      return;
    }

    modalTriggerRef.current = trigger ?? null;
    closeSearch();
    setSelectedPackSlug(card.id);
  }, [closeSearch]);

  const closePackModal = useCallback(() => {
    setSelectedPackSlug(null);
    window.requestAnimationFrame(() => {
      modalTriggerRef.current?.focus();
    });
  }, []);

  const selectRelatedPack = useCallback((slug: string) => {
    setSelectedPackSlug(slug);
  }, []);
  const selectSuggestion = useCallback((card: CatalogCard, trigger?: HTMLElement | null) => {
    if (!card.real) {
      setQuery(card.title);
      closeSearch();
      return;
    }

    openPackModal(card, trigger);
  }, [closeSearch, openPackModal]);

  const updateFilterScrollState = useCallback(() => {
    const rail = filterRailRef.current;
    if (!rail) {
      return;
    }

    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setCanScrollFiltersPrev(rail.scrollLeft > 8);
    setCanScrollFiltersNext(rail.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    updateFilterScrollState();
    const rail = filterRailRef.current;
    if (!rail) {
      return;
    }

    rail.addEventListener('scroll', updateFilterScrollState, { passive: true });
    window.addEventListener('resize', updateFilterScrollState);

    return () => {
      rail.removeEventListener('scroll', updateFilterScrollState);
      window.removeEventListener('resize', updateFilterScrollState);
    };
  }, [updateFilterScrollState]);

  useEffect(() => {
    filterButtonRefs.current.get(activeFilter)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    updateFilterScrollState();
  }, [activeFilter, updateFilterScrollState]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!searchWrapRef.current?.contains(event.target as Node)) {
        closeSearch();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closeSearch]);

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSuggestionIndex((index) => Math.min(index + 1, Math.max(searchSuggestions.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSuggestionIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter' && isSearchOpen && activeSuggestion) {
      event.preventDefault();
      selectSuggestion(activeSuggestion);
      return;
    }

    if (event.key === 'Escape') {
      closeSearch();
      return;
    }

    if (event.key === 'Tab') {
      closeSearch();
    }
  };
  return (
    <section id="catalog" className={`${styles.catalogSection} ${standalone ? styles.catalogStandalone : ''}`}>
      <div className="container">
        <div className={styles.hero}>
          <h2>{labels.catalog}</h2>
          <p>{labels.subtitle}</p>
        </div>

        <div className={styles.controls} aria-label={labels.controlsLabel}>
          <div className={styles.searchWrap} ref={searchWrapRef}>
            <label className={styles.searchBox}>
              <span className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                role="combobox"
                aria-label={labels.searchAria}
                aria-expanded={isSearchOpen}
                aria-controls="catalog-search-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={isSearchOpen && activeSuggestion ? `catalog-search-option-${activeSuggestion.id}` : undefined}
                value={query}
                onFocus={() => setIsSearchOpen(true)}
                onClick={() => setIsSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveSuggestionIndex(0);
                  setIsSearchOpen(true);
                }}
                placeholder={labels.searchPlaceholder}
              />
            </label>

            {isSearchOpen ? (
              <div
                id="catalog-search-suggestions"
                className={styles.searchDropdown}
                role="listbox"
                aria-label={labels.suggestionsTitle}
              >
                <div className={styles.searchDropdownTitle}>{labels.suggestionsTitle}</div>
                {searchSuggestions.length > 0 ? (
                  searchSuggestions.map((card, index) => (
                    <button
                      key={card.id}
                      id={`catalog-search-option-${card.id}`}
                      type="button"
                      role="option"
                      aria-selected={activeSuggestionIndex === index}
                      className={`${styles.suggestionItem} ${activeSuggestionIndex === index ? styles.suggestionItemActive : ''}`}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => selectSuggestion(card, event.currentTarget)}
                    >
                      <span className={styles.suggestionThumb} aria-hidden="true">
                        <Image src={card.image} alt="" fill className={styles.suggestionImage} sizes="52px" />
                      </span>
                      <span className={styles.suggestionText}>
                        <span className={styles.suggestionTitle}>{card.title}</span>
                        <span className={styles.suggestionMeta}>{card.real ? card.categoryLabel : labels.soon}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className={styles.suggestionEmpty}>{labels.nothingFound}</div>
                )}
              </div>
            ) : null}
          </div>

          <div
            className={styles.filterScroller}
            data-can-prev={canScrollFiltersPrev}
            data-can-next={canScrollFiltersNext}
          >
            <div className={styles.filters} ref={filterRailRef} role="list" aria-label={labels.filtersLabel}>
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  ref={(node) => {
                    if (node) {
                      filterButtonRefs.current.set(filter.id, node);
                    } else {
                      filterButtonRefs.current.delete(filter.id);
                    }
                  }}
                  type="button"
                  className={`${styles.filterPill} ${activeFilter === filter.id ? styles.filterPillActive : ''}`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.collections} aria-label={labels.collectionsLabel}>
          {visibleCollections.length > 0 ? (
            visibleCollections.map((collection) => (
              <CarouselRow key={collection.id} collection={collection} cards={collection.cards} onOpenPack={openPackModal} />
            ))
          ) : resultCards.length > 0 ? (
            <CarouselRow collection={resultCollection} cards={resultCards} onOpenPack={openPackModal} />
          ) : (
            <p className={styles.emptyState}>{query.trim() ? labels.nothingFound : labels.noCategoryItems}</p>
          )}
        </div>

        <>
            <div className={styles.toggleWrap}>
              <button
                type="button"
                className={`${styles.toggleAllButton} ${showAllPhotoshoots ? styles.toggleAllButtonOpen : ''}`}
                onClick={() => setShowAllPhotoshoots((current) => !current)}
                aria-expanded={showAllPhotoshoots}
                aria-controls="catalog-all-photoshoots"
              >
                <span>{showAllPhotoshoots ? labels.hideAll : labels.showAll}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            <div
              id="catalog-all-photoshoots"
              className={`${styles.fullCatalogPanel} ${showAllPhotoshoots ? styles.fullCatalogPanelOpen : ''}`}
              aria-hidden={!showAllPhotoshoots}
            >
              <div className={styles.fullCatalogInner}>
                <h3>{labels.allPhotoshoots}</h3>
                <div className={styles.fullGrid}>
                  {fullCatalogCards.map((card) => (
                    <Card key={`all-${card.id}`} card={card} onOpen={openPackModal} />
                  ))}
                </div>
              </div>
            </div>
          </>
      </div>
      {selectedPack ? (
        <PhotoPackModal pack={selectedPack} onClose={closePackModal} onSelectPack={selectRelatedPack} />
      ) : null}
    </section>
  );
}