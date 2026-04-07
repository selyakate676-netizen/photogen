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
      { src: '/career-woman-blazer.png', label: 'У окна офиса' },
      { src: '/career-man-editorial.png', label: 'Тёмный фон' },
      { src: '/career-woman-1.png', label: 'Студийный свет' },
      { src: '/studio-white-suit.png', label: 'Белый костюм' },
      { src: '/career-woman-2.png', label: 'Classic blazer' },
      { src: '/review-avatar-1.png', label: 'Дневной свет' },
      { src: '/studio-bw-man.png', label: 'Чёрно-белое' },
      { src: '/review-avatar-2.png', label: 'Деловой стиль' },
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
      { src: '/dating-woman-mirror.png', label: 'У зеркала' },
      { src: '/studio-stool-woman.png', label: 'В студии' },
      { src: '/dating-woman-1.png', label: 'Золотой час' },
      { src: '/studio-bw-man.png', label: 'Чёрно-белое' },
      { src: '/dating-man-1.png', label: 'В кафе' },
      { src: '/studio-red-light.png', label: 'В прожекторе' },
      { src: '/social-woman-car.png', label: 'Стритстайл' },
      { src: '/dating-woman-3.png', label: 'Естественный кадр' },
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
      { src: '/studio-red-light.png', label: 'Красный неон' },
      { src: '/studio-stool-woman.png', label: 'Журнальная обложка' },
      { src: '/social-woman-1.png', label: 'Отдых у моря' },
      { src: '/studio-white-suit.png', label: 'Элегантность' },
      { src: '/social-woman-2.png', label: 'В парке' },
      { src: '/selfie-2.png', label: 'Домашнее селфи' },
      { src: '/social-woman-3.png', label: 'Прогулка' },
      { src: '/career-man-editorial.png', label: 'Студийный портрет' },
    ],
  },
];

interface PhotoItem {
  src: string;
  label: string;
}

interface ScrollRowProps {
  photos: PhotoItem[];
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
          {photos.map((photo, pIdx) => (
            <div 
              key={pIdx} 
              className={styles.photoCard}
              onClick={() => {
                  const duration = Date.now() - startTime.current;
                  if (duration < 200) onPhotoClick(photo.src);
              }}
            >
              <Image
                src={photo.src}
                alt={photo.label}
                fill
                className={styles.photoImg}
                sizes="(max-width: 768px) 300px, 450px"
                draggable={false}
              />
              <div className={styles.photoLabel}>{photo.label}</div>
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
                    {selectedSection.photos.slice(0, 8).map((photo, i) => (
                      <div 
                        key={i} 
                        className={styles.similarThumb}
                        onClick={() => setSelectedPhoto(photo.src)}
                      >
                        <Image src={photo.src} alt="Similar" fill className="object-cover" />
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
