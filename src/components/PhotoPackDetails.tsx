'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PhotoPack } from '@/lib/photoPacks';
import styles from './PhotoPackDetails.module.css';

type PhotoPackDetailsProps = {
  pack: PhotoPack;
  relatedPacks: PhotoPack[];
  mode?: 'page' | 'modal';
  onClose?: () => void;
  onSelectPack?: (slug: string) => void;
  titleId?: string;
};

const labels = {
  navigation: '\u041d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f',
  catalog: '\u041a\u0430\u0442\u0430\u043b\u043e\u0433',
  close: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c',
  gallery: '\u041f\u0440\u0438\u043c\u0435\u0440\u044b \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
  openFrame: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0434\u0440',
  specs: '\u0425\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a\u0438 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
  readyPhotos: '\u0433\u043e\u0442\u043e\u0432\u044b\u0445 \u0444\u043e\u0442\u043e',
  sourceSelfies: '\u0438\u0441\u0445\u043e\u0434\u043d\u044b\u0445 \u0441\u0435\u043b\u0444\u0438',
  approxTime: '\u043f\u0440\u0438\u043c\u0435\u0440\u043d\u043e\u0435 \u0432\u0440\u0435\u043c\u044f',
  highQuality: '\u0432\u044b\u0441\u043e\u043a\u043e\u0435 \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u043e',
  minutes: '~5 \u043c\u0438\u043d',
  included: '\u0427\u0442\u043e \u0432\u0445\u043e\u0434\u0438\u0442 \u0432 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u044e',
  modalIncluded: '\u0412\u044b \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u0435',
  professionalPhotos: '\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0444\u043e\u0442\u043e',
  images: '\u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0439',
  inHighQuality: '\u0432 \u0432\u044b\u0441\u043e\u043a\u043e\u043c \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0435',
  forSocial: '\u0434\u043b\u044f \u0441\u043e\u0446\u0441\u0435\u0442\u0435\u0439 \u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f',
  suitableFor: '\u041f\u043e\u0434\u0445\u043e\u0434\u0438\u0442 \u0434\u043b\u044f',
  start: '\u041d\u0430\u0447\u0430\u0442\u044c \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u044e',
  relatedModal: '\u0412\u0430\u043c \u043c\u043e\u0436\u0435\u0442 \u043f\u043e\u043d\u0440\u0430\u0432\u0438\u0442\u044c\u0441\u044f',
  relatedPage: '\u0412\u0430\u043c \u0442\u0430\u043a\u0436\u0435 \u043c\u043e\u0436\u0435\u0442 \u043f\u043e\u043d\u0440\u0430\u0432\u0438\u0442\u044c\u0441\u044f',
  photo: '\u0444\u043e\u0442\u043e',
  lightbox: '\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0444\u043e\u0442\u043e\u0433\u0440\u0430\u0444\u0438\u0438',
  closeLightbox: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440',
  prevFrame: '\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0439 \u043a\u0430\u0434\u0440',
  nextFrame: '\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u043a\u0430\u0434\u0440',
  previousPacks: '\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0435 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
  nextPacks: '\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0435 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
};

const frameTypes = [
  { title: '\u041a\u0440\u0443\u043f\u043d\u044b\u0439 \u043f\u043b\u0430\u043d', text: '\u0412\u044b\u0440\u0430\u0437\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u0440\u0442\u0440\u0435\u0442 \u043b\u0438\u0446\u0430' },
  { title: '\u041f\u043e \u0433\u0440\u0443\u0434\u044c / \u043f\u043e\u044f\u0441', text: '\u0414\u043b\u044f \u043f\u0440\u043e\u0444\u0438\u043b\u044f \u0438 \u0441\u043e\u0446\u0441\u0435\u0442\u0435\u0439' },
  { title: '\u041a\u0430\u0434\u0440 3/4', text: '\u041f\u043e\u0437\u0430, \u043e\u0431\u0440\u0430\u0437 \u0438 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435' },
  { title: '\u041f\u043e\u043b\u043d\u044b\u0439 \u0440\u043e\u0441\u0442', text: '\u041f\u043e\u043b\u043d\u044b\u0439 \u043e\u0431\u0440\u0430\u0437 \u0438 \u043e\u043a\u0440\u0443\u0436\u0435\u043d\u0438\u0435' },
];

const frameBenefits = [
  '\u041a\u0440\u0443\u043f\u043d\u044b\u0439 \u043f\u043e\u0440\u0442\u0440\u0435\u0442',
  '\u041f\u043e\u0440\u0442\u0440\u0435\u0442 \u043f\u043e \u0433\u0440\u0443\u0434\u044c / \u043f\u043e\u044f\u0441',
  '\u041a\u0430\u0434\u0440 3/4',
  '\u041f\u043e\u043b\u043d\u044b\u0439 \u0440\u043e\u0441\u0442',
];

const commonBenefits = [
  '\u0412\u0435\u0440\u0442\u0438\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442',
  '\u0412\u044b\u0441\u043e\u043a\u043e\u0435 \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u043e',
  '\u0413\u043e\u0442\u043e\u0432\u043e \u043f\u0440\u0438\u043c\u0435\u0440\u043d\u043e \u0437\u0430 5 \u043c\u0438\u043d\u0443\u0442',
];

export default function PhotoPackDetails({
  pack,
  relatedPacks,
  mode = 'page',
  onClose,
  onSelectPack,
  titleId,
}: PhotoPackDetailsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mobileFrameIndex, setMobileFrameIndex] = useState(0);
  const [canScrollRelatedPrev, setCanScrollRelatedPrev] = useState(false);
  const [canScrollRelatedNext, setCanScrollRelatedNext] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const relatedRailRef = useRef<HTMLDivElement>(null);
  const isModal = mode === 'modal';

  const gallery = useMemo(() => {
    const uniqueImages = Array.from(new Set([pack.image, ...pack.gallery]));
    return uniqueImages.slice(0, 4);
  }, [pack.gallery, pack.image]);

  const modalBenefits = useMemo(
    () => [...frameBenefits.slice(0, Math.min(gallery.length, frameBenefits.length)), ...commonBenefits],
    [gallery.length],
  );


  useEffect(() => {
    if (lightboxIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setLightboxIndex(null);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setLightboxIndex((current) => (current === null ? 0 : (current + 1) % gallery.length));
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setLightboxIndex((current) => (current === null ? 0 : (current - 1 + gallery.length) % gallery.length));
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [gallery.length, lightboxIndex]);

  const startHref = `/dashboard/new?style=${pack.id}`;
  const visibleRelated = relatedPacks.slice(0, isModal ? 8 : 6);
  const currentLightboxImage = lightboxIndex === null ? null : gallery[lightboxIndex];

  const updateRelatedScrollState = useCallback(() => {
    const rail = relatedRailRef.current;
    if (!rail) return;

    setCanScrollRelatedPrev(rail.scrollLeft > 4);
    setCanScrollRelatedNext(rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 4);
  }, []);

  useEffect(() => {
    const rail = relatedRailRef.current;
    if (!rail) return;

    updateRelatedScrollState();
    rail.addEventListener('scroll', updateRelatedScrollState, { passive: true });
    window.addEventListener('resize', updateRelatedScrollState);

    return () => {
      rail.removeEventListener('scroll', updateRelatedScrollState);
      window.removeEventListener('resize', updateRelatedScrollState);
    };
  }, [updateRelatedScrollState, visibleRelated.length]);

  const goToLightboxImage = (direction: -1 | 1) => {
    setLightboxIndex((current) => {
      if (current === null) {
        return 0;
      }

      return (current + direction + gallery.length) % gallery.length;
    });
  };

  const handleGalleryScroll = (event: UIEvent<HTMLDivElement>) => {
    const rail = event.currentTarget;
    const firstFrame = rail.querySelector<HTMLElement>(`.${styles.frameCard}`);
    if (!firstFrame) {
      return;
    }

    const frameWidth = firstFrame.offsetWidth + 12;
    setMobileFrameIndex(Math.min(gallery.length - 1, Math.max(0, Math.round(rail.scrollLeft / frameWidth))));
  };

  const scrollRelatedPacks = (direction: -1 | 1) => {
    const rail = relatedRailRef.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.78, 260),
      behavior: 'smooth',
    });
  };

  return (
    <div className={`${styles.shell} ${isModal ? styles.shellModal : ''}`}>
      {!isModal ? (
        <nav className={styles.breadcrumbs} aria-label={labels.navigation}>
          <Link href="/#catalog">{labels.catalog}</Link>
          <span aria-hidden="true">/</span>
          <span>{pack.title}</span>
        </nav>
      ) : null}

      <section className={styles.heroGrid}>
        <div className={styles.galleryColumn} aria-label={labels.gallery}>
          <div className={styles.frameGallery} data-frame-count={gallery.length} ref={galleryRef} onScroll={handleGalleryScroll}>
            {gallery.map((image, index) => (
              <button
                key={image}
                type="button"
                className={styles.frameCard}
                onClick={() => setLightboxIndex(index)}
                aria-label={`${labels.openFrame}: ${frameTypes[index]?.title ?? `\u041a\u0430\u0434\u0440 ${index + 1}`}`}
              >
                <Image
                  src={image}
                  alt={frameTypes[index]?.title ?? pack.title}
                  fill
                  priority={!isModal && index === 0}
                  className={styles.frameImage}
                  sizes={isModal ? '(max-width: 768px) 84vw, 31vw' : '(max-width: 768px) 86vw, 34vw'}
                />
              </button>
            ))}
          </div>
          <div className={styles.mobileGalleryHint} aria-live="polite">
            {mobileFrameIndex + 1} / {gallery.length}
          </div>
        </div>

        <aside className={styles.summary}>
          <header className={isModal ? styles.infoHeaderModal : styles.infoHeader}>
            <div>
              <p className={styles.eyebrow}>{pack.categoryLabel}</p>
              <h1 id={titleId}>{pack.title}</h1>
            </div>
            {isModal && onClose ? (
              <button type="button" data-modal-close="true" className={styles.closeButton} onClick={onClose} aria-label={labels.close}>
                <span aria-hidden="true">{'\u00d7'}</span>
              </button>
            ) : null}
          </header>

          <p className={styles.summaryText}>{pack.summary}</p>

          {isModal ? (
            <>
              <section className={styles.benefitsBlock}>
                <h2>{labels.modalIncluded}</h2>
                <p className={styles.benefitsLead}>{gallery.length} {labels.professionalPhotos}:</p>
                <ul className={styles.benefitsList}>
                  {modalBenefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              </section>

              <Link href={startHref} className={styles.summaryCta}>
                {labels.start}
              </Link>
            </>
          ) : (
            <>
              <div className={styles.specGrid} aria-label={labels.specs}>
                <div>
                  <span>{pack.photos}</span>
                  <p>{labels.readyPhotos}</p>
                </div>
                <div>
                  <span>1-3</span>
                  <p>{labels.sourceSelfies}</p>
                </div>
                <div>
                  <span>{labels.minutes}</span>
                  <p>{labels.approxTime}</p>
                </div>
                <div>
                  <span>HQ</span>
                  <p>{labels.highQuality}</p>
                </div>
              </div>


              <section className={styles.outcomeBlock}>
                <h2>{labels.included}</h2>
                <div className={styles.outcomeGrid}>
                  {frameTypes.map((item) => (
                    <article key={item.title} className={styles.outcomeCard}>
                      <span aria-hidden="true" />
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>
                <div className={styles.qualityNote}>
                  <span>{pack.photos} {labels.images}</span>
                  <span>{labels.inHighQuality}</span>
                  <span>{labels.forSocial}</span>
                </div>
              </section>
            </>
          )}
        </aside>
      </section>

      {!isModal ? (
        <section className={styles.sectionBlock}>
          <h2>{labels.suitableFor}</h2>
          <div className={styles.chips}>
            {pack.suitableFor.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
      ) : null}

      {!isModal ? (
        <div className={styles.bottomCtaWrap}>
          <Link href={startHref} className={styles.bottomCta}>
            {labels.start}
          </Link>
        </div>
      ) : null}

      <section className={styles.sectionBlock}>
        <div className={styles.relatedHeader}>
          <h2>{isModal ? labels.relatedModal : labels.relatedPage}</h2>
        </div>
        <div
          className={styles.relatedRailFrame}
          data-can-prev={canScrollRelatedPrev}
          data-can-next={canScrollRelatedNext}
        >
          {isModal ? (
            <button
              type="button"
              className={`${styles.relatedRailButton} ${styles.relatedRailButtonPrev}`}
              onClick={() => scrollRelatedPacks(-1)}
              aria-label={labels.previousPacks}
              disabled={!canScrollRelatedPrev}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          ) : null}
          <div className={styles.relatedRail} ref={relatedRailRef}>
            {visibleRelated.map((related) => {
            const content = (
              <>
                <div className={styles.relatedImageWrap}>
                  <Image src={related.image} alt="" fill className={styles.relatedImage} sizes="(max-width: 768px) 54vw, 18vw" />
                </div>
                <h3>{related.title}</h3>
                <p>{related.description}</p>
                <span>{related.photos} {labels.photo}</span>
              </>
            );

            if (isModal && onSelectPack) {
              return (
                <button key={related.id} type="button" className={styles.relatedCard} onClick={() => onSelectPack(related.slug)}>
                  {content}
                </button>
              );
            }

            return (
              <Link key={related.id} href={`/packs/${related.slug}`} className={styles.relatedCard}>
                {content}
              </Link>
            );
            })}
          </div>
          {isModal ? (
            <button
              type="button"
              className={`${styles.relatedRailButton} ${styles.relatedRailButtonNext}`}
              onClick={() => scrollRelatedPacks(1)}
              aria-label={labels.nextPacks}
              disabled={!canScrollRelatedNext}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </section>

      {currentLightboxImage ? (
        <div
          className={styles.lightboxOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={labels.lightbox}
          onMouseDown={(event) => event.currentTarget === event.target && setLightboxIndex(null)}
        >
          <button type="button" className={styles.lightboxClose} onClick={() => setLightboxIndex(null)} aria-label={labels.closeLightbox}>
            <span aria-hidden="true">{'\u00d7'}</span>
          </button>
          <button type="button" className={`${styles.lightboxArrow} ${styles.lightboxPrev}`} onClick={() => goToLightboxImage(-1)} aria-label={labels.prevFrame}>
            <span aria-hidden="true">{'\u2039'}</span>
          </button>
          <div className={styles.lightboxImageWrap}>
            <Image src={currentLightboxImage} alt={frameTypes[lightboxIndex ?? 0]?.title ?? pack.title} fill className={styles.lightboxImage} sizes="90vw" />
            <span className={styles.lightboxCaption}>
              {(lightboxIndex ?? 0) + 1} / {gallery.length} {'\u00b7'} {frameTypes[lightboxIndex ?? 0]?.title}
            </span>
          </div>
          <button type="button" className={`${styles.lightboxArrow} ${styles.lightboxNext}`} onClick={() => goToLightboxImage(1)} aria-label={labels.nextFrame}>
            <span aria-hidden="true">{'\u203a'}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}