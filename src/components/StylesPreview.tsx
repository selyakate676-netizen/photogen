'use client';

import { useRef } from 'react';
import Image from 'next/image';
import styles from './StylesPreview.module.css';
import Reveal from './Reveal';

const sections = [
  {
    id: 'career',
    title: 'Для резюме и деловых',
    highlight: 'профилей',
    desc: 'Профессиональный портрет для hh.ru, деловых чатов и сайтов компаний.',
    photos: [
      '/career-woman-1.png',
      '/career-woman-2.png',
      '/career-woman-3.png',
      '/career-man-1.png',
      '/career-woman-1.png',
      '/career-woman-2.png',
      '/career-woman-3.png',
      '/career-man-1.png',
      '/career-woman-1.png',
      '/career-woman-2.png',
    ],
  },
  {
    id: 'dating',
    title: 'Для знакомств и',
    highlight: 'свиданий',
    desc: 'Живые, притягательные фото для Mamba, Badoo и Авито Знакомств.',
    photos: [
      '/ashley-1.png',
      '/ashley-2.png',
      '/ashley-3.png',
      '/ashley-4.png',
      '/dating-woman-1.png',
      '/dating-woman-2.png',
      '/dating-man-1.png',
      '/ashley-1.png',
      '/ashley-2.png',
      '/ashley-3.png',
    ],
  },
  {
    id: 'social',
    title: 'Для соцсетей и',
    highlight: 'аватарок',
    desc: 'Путешествия, стрит-стайл и лайфстайл — образы на каждый день.',
    photos: [
      '/social-woman-1.png',
      '/social-woman-2.png',
      '/social-woman-3.png',
      '/social-woman-1.png',
      '/social-woman-2.png',
      '/social-woman-3.png',
      '/social-woman-1.png',
      '/social-woman-2.png',
      '/social-woman-3.png',
      '/social-woman-1.png',
      '/social-woman-2.png',
      '/social-woman-3.png',
    ],
  },
];

function ScrollRow({ photos, title }: { photos: string[]; title: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (rowRef.current?.offsetLeft ?? 0);
    scrollLeft.current = rowRef.current?.scrollLeft ?? 0;
    if (rowRef.current) rowRef.current.style.cursor = 'grabbing';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !rowRef.current) return;
    e.preventDefault();
    const x = e.pageX - (rowRef.current.offsetLeft ?? 0);
    const walk = (x - startX.current) * 1.5;
    rowRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const onMouseUp = () => {
    isDragging.current = false;
    if (rowRef.current) rowRef.current.style.cursor = 'grab';
  };

  return (
    <div
      ref={rowRef}
      className={styles.scrollTrack}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className={styles.scrollRow}>
        {photos.map((src, pIdx) => (
          <div key={pIdx} className={styles.photoCard}>
            <Image
              src={src}
              alt={title}
              fill
              className={styles.photoImg}
              sizes="(max-width: 768px) 180px, 280px"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StylesPreview() {
  return (
    <section className={`${styles.stylesSection} section section-light`} id="styles">
      {sections.map((section, sIdx) => (
        <div key={section.id} className={styles.sectionBlock}>
          <div className="container">
            <Reveal delay={0.1}>
              <h2 className="section-title">
                {section.title} <span className="gradient-text">{section.highlight}</span>
              </h2>
              <p className="section-subtitle">{section.desc}</p>
            </Reveal>
          </div>

          <ScrollRow photos={section.photos} title={section.title} />
        </div>
      ))}

      <div className="container">
        <Reveal>
          <div className={styles.moreStylesContainer}>
            <p className={styles.moreStylesText}>И ещё 15+ направлений съёмки ждут вас внутри</p>
            <a href="/login" className="btn btn-primary btn-lg">
              Смотреть все стили
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
