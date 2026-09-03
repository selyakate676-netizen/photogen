'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Gem } from 'lucide-react';
import PhotoPackModal from '@/components/PhotoPackModal';
import { getPhotoPack, photoPacks } from '@/lib/photoPacks';
import { trackAnalyticsGoal } from '@/lib/analytics';
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
  { id: 'lifestyle', label: labels.lifestyle },
  { id: 'women', label: '\u0414\u043b\u044f \u0436\u0435\u043d\u0449\u0438\u043d' },
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
const catalogCards = realCards;

const collections: Collection[] = [
  { id: 'popular', title: labels.popular, cardIds: ['autumn-promenade', 'misty-morning', 'golden-field'] },
  { id: 'lifestyle-row', title: labels.lifestyle, category: 'lifestyle', cardIds: ['autumn-promenade', 'misty-morning', 'golden-field'] },
];


const filterCardIds: Partial<Record<FilterId, string[]>> = {
  women: ['autumn-promenade', 'misty-morning', 'golden-field'],
  new: ['autumn-promenade', 'misty-morning', 'golden-field'],
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
  const sectionRef = useRef<HTMLElement>(null);
  const catalogViewSentRef = useRef(false);
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
    const section = sectionRef.current;
    if (!section || catalogViewSentRef.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || catalogViewSentRef.current) return;
      catalogViewSentRef.current = true;
      trackAnalyticsGoal('catalog_view', { source_page: standalone ? 'catalog' : 'landing' });
      observer.disconnect();
    }, { threshold: 0.2 });

    observer.observe(section);
    return () => observer.disconnect();
  }, [standalone]);

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
    <section ref={sectionRef} id="catalog" className={`${styles.catalogSection} ${standalone ? styles.catalogStandalone : ''}`}>
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
