'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './StylesPreview.module.css';
import Reveal from './Reveal';

const sections = [
  {
    id: 'career',
    title: 'Для резюме и бизнес-',
    highlight: 'профилей',
    modalLabel: 'Бизнес-портрет',
    desc: 'Профессиональный портрет для hh.ru, деловых чатов и сайтов компаний.',
    prompt: 'Профессиональный бизнес-портрет, студийный свет, офисный стиль, высокое разрешение.',
    photos: [
      '/career-woman-blazer.png',
      '/career-man-editorial.png',
      '/career-woman-1.png',
      '/career-man-1.png',
      '/career-woman-2.png',
      '/review-avatar-1.png',
      '/career-woman-3.png',
      '/review-avatar-2.png',
    ],
  },
  {
    id: 'dating',
    title: 'Для знакомств и',
    highlight: 'свиданий',
    modalLabel: 'Фото для знакомств',
    desc: 'Живые, притягательные фото для Mamba, Badoo и Авито Знакомств.',
    prompt: 'Живое лайфстайл фото, естественный свет, теплая атмосфера, кинематографичный вид.',
    photos: [
      '/dating-woman-mirror.png',
      '/dating-man-outdoor.png',
      '/dating-woman-1.png',
      '/ashley-1.png',
      '/dating-man-1.png',
      '/dating-woman-2.png',
      '/ashley-2.png',
      '/dating-woman-3.png',
    ],
  },
  {
    id: 'social',
    title: 'Для соцсетей и',
    highlight: 'аватарок',
    modalLabel: 'Лайфстайл и соцсети',
    desc: 'Путешествия, стрит-стайл и лайфстайл — образы на каждый день.',
    prompt: 'Стильный городской образ, стрит-стайл, мягкая журнальная ретушь, яркие цвета.',
    photos: [
      '/social-woman-car.png',
      '/social-woman-cafe.png',
      '/social-woman-1.png',
      '/gallery-1.png',
      '/social-woman-2.png',
      '/selfie-2.png',
      '/social-woman-3.png',
      '/gallery-3.png',
    ],
  },
];

interface ScrollRowProps {
  photos: string[];
  title: string;
  onPhotoClick: (src: string) => void;
}

function ScrollRow({ photos, title, onPhotoClick }: ScrollRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const startTime = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startTime.current = Date.now();
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

  const onMouseUp = (e: React.MouseEvent, src: string) => {
    isDragging.current = false;
    if (rowRef.current) rowRef.current.style.cursor = 'grab';
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const scrollAmount = 600;
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className={styles.scrollWrapper}>
      <button 
        className={`${styles.navBtn} ${styles.navBtnLeft}`} 
        onClick={() => scroll('left')}
        aria-label="Scroll left"
      >
        <ChevronLeft size={28} />
      </button>

      <div
        ref={rowRef}
        className={styles.scrollTrack}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={(e) => onMouseUp(e, '')}
        onMouseLeave={() => { isDragging.current = false; }}
      >
        <div className={styles.scrollRow}>
          {photos.map((src, pIdx) => (
            <div 
              key={pIdx} 
              className={styles.photoCard}
              onClick={() => {
                  const duration = Date.now() - startTime.current;
                  if (duration < 200) onPhotoClick(src);
              }}
            >
              <Image
                src={src}
                alt={title}
                fill
                className={styles.photoImg}
                sizes="(max-width: 768px) 300px, 450px"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      <button 
        className={`${styles.navBtn} ${styles.navBtnRight}`} 
        onClick={() => scroll('right')}
        aria-label="Scroll right"
      >
        <ArrowRight size={24} />
      </button>
    </div>
  );
}

export default function StylesPreview() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<typeof sections[0] | null>(null);

  const openModal = (src: string, section: typeof sections[0]) => {
    setSelectedPhoto(src);
    setSelectedSection(section);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedPhoto(null);
    setSelectedSection(null);
    document.body.style.overflow = 'auto';
  };

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <section className={`${styles.stylesSection} section section-light`} id="styles">
      {sections.map((section) => (
        <div key={section.id} className={styles.sectionBlock}>
          <div className="container">
            <Reveal delay={0.1}>
              <h2 className="section-title">
                {section.title}{' '}<span className="gradient-text">{section.highlight}</span>
              </h2>
              <p className="section-subtitle">{section.desc}</p>
            </Reveal>
          </div>

          <ScrollRow 
            photos={section.photos} 
            title={section.title} 
            onPhotoClick={(src) => openModal(src, section)}
          />
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

      {/* --- Modal Window --- */}
      {selectedPhoto && selectedSection && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal}>
              <X size={24} />
            </button>
            
            <div className={styles.modalGrid}>
              {/* Left Column: Image */}
              <div className={styles.modalImageCard}>
                <Image
                  src={selectedPhoto}
                  alt={selectedSection.title}
                  fill
                  className={styles.modalImg}
                  sizes="(max-width: 768px) 100vw, 600px"
                />
                <div className={styles.iaBadge}>НА 100% ИИ-ФОТО</div>
              </div>

              {/* Right Column: Info */}
              <div className={styles.modalInfo}>
                <div className={styles.modalHeader}>
                  <p className={styles.categoryLabel}>{selectedSection.modalLabel}</p>
                  <h3 className={styles.modalTitle}>Пример генерации</h3>
                </div>

                <div className={styles.promptBox}>
                  <p className={styles.promptLabel}>Запрос (Prompt):</p>
                  <p className={styles.promptText}>{selectedSection.prompt}</p>
                </div>

                <a href="/login" className={`btn btn-primary btn-lg ${styles.tryBtn}`}>
                  Примерить образ на себе <ArrowRight size={20} className="ml-2 inline" />
                </a>

                <div className={styles.similarSection}>
                  <p className={styles.similarLabel}>Похожие варианты:</p>
                  <div className={styles.similarGrid}>
                    {selectedSection.photos.slice(0, 8).map((src, i) => (
                      <div 
                        key={i} 
                        className={styles.similarThumb}
                        onClick={() => setSelectedPhoto(src)}
                      >
                        <Image src={src} alt="Similar" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                <button className={styles.moreLink} onClick={closeModal}>
                    Посмотреть больше стилей
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
