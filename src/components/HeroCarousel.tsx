'use client';

import { useEffect, useState } from 'react';
import ImageSlider from './ImageSlider';
import styles from './HeroCarousel.module.css';
import type { HeroVisualGroup } from '@/lib/marketingVisuals';

const ROTATION_INTERVAL_MS = 9000;
const FADE_DURATION_MS = 450;

export default function HeroCarousel({ groups }: { groups: readonly HeroVisualGroup[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const activeGroup = groups[activeIndex];

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches || groups.length < 2) return;

    let fadeTimeout: number | undefined;
    const rotationInterval = window.setInterval(() => {
      setIsVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setActiveIndex((current) => (current + 1) % groups.length);
        setIsVisible(true);
      }, FADE_DURATION_MS);
    }, ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(rotationInterval);
      if (fadeTimeout) window.clearTimeout(fadeTimeout);
    };
  }, [groups.length]);

  return (
    <div className={styles.carousel} aria-roledescription="карусель" aria-label="Примеры AI-фотосессий">
      <div className={`${styles.group} ${isVisible ? styles.visible : ''}`}>
        <ImageSlider
          key={activeGroup.id}
          beforeImages={[activeGroup.source]}
          afterImages={activeGroup.results}
          beforeLabel=""
          afterLabel=""
          autoPlay
          variant="hero"
          priority={activeIndex === 0}
        />
      </div>
      <div className={styles.status} aria-live="polite">
        <span className={styles.srOnly}>Пример {activeIndex + 1} из {groups.length}</span>
        {groups.map((group, index) => (
          <span className={index === activeIndex ? styles.activeDot : styles.dot} key={group.id} aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}