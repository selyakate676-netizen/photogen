"use client";

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Templates.module.css';
import Reveal from './Reveal';

const templates = [
  {
    id: 1,
    title: 'Красный неон',
    src: '/ref-neon.png',
  },
  {
    id: 2,
    title: 'Журнальная обложка',
    src: '/ref-vintage.png',
  },
  {
    id: 3,
    title: 'Отдых у моря',
    src: '/ref-golden.png',
  },
  {
    id: 4,
    title: 'Элегантность',
    src: '/ref-bw-blinds.png',
  },
  {
    id: 5,
    title: 'Студийный неон',
    src: '/studio-red-light-v2.png',
  },
  {
    id: 6,
    title: 'Студийный свет',
    src: '/ref-golden.png',
  },
];

export default function Templates() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 400;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  return (
    <section className={`${styles.templates} section section-dark`} id="templates">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            Идеи для <span className="gradient-text">вдохновения</span>
          </h2>
          <p className="section-subtitle">
            Мы переносим вас в лучшие работы мировых фотографов
          </p>
        </Reveal>
      </div>

      <div className={styles.scrollWrapper}>
        <button 
          className={`${styles.navBtn} ${styles.navBtnLeft}`} 
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <ChevronLeft size={24} />
        </button>

        <div className={styles.scrollContainer} ref={scrollRef}>
          <div className={styles.grid}>
            {templates.map((tpl, i) => (
              <Reveal key={tpl.id} delay={i * 1.5} className={styles.cardWrapper}>
                <div className={styles.card}>
                  <img src={tpl.src} alt={tpl.title} className={styles.image} />
                  <div className={styles.overlay}>
                    <div className={styles.pillLabel}>{tpl.title}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        
        <button 
          className={`${styles.navBtn} ${styles.navBtnRight}`} 
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  );
}
