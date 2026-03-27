'use client';

import { useState } from 'react';
import { Briefcase, Heart, Share2, UserCircle, X } from 'lucide-react';
import Image from 'next/image';
import styles from './StylesPreview.module.css';
import Reveal from './Reveal';

const photoStyles = [
  {
    id: 'business',
    icon: <Briefcase size={40} strokeWidth={1.5} />,
    title: 'Для резюме и рабочих чатов',
    desc: 'Деловой портрет, который внушает доверие. Для hh.ru, профиля компании и деловых переговоров.',
    tag: 'Популярное',
    examples: ['/studio-glamour.png', '/studio-fashion.png'], // Placeholder images
  },
  {
    id: 'dating',
    icon: <Heart size={40} strokeWidth={1.5} />,
    title: 'Для сайтов знакомств',
    desc: 'Естественные и привлекательные фото, где вы выглядите как в жизни — только с лучшим ракурсом.',
    tag: 'Хит',
    examples: ['/studio-nature.png', '/studio-glamour.png'],
  },
  {
    id: 'social',
    icon: <Share2 size={40} strokeWidth={1.5} />,
    title: 'Для соцсетей',
    desc: 'Стильные фото для ВКонтакте, Одноклассников, Instagram и Telegram. Красивые локации и натуральные позы.',
    tag: 'Для всех',
    examples: ['/studio-fashion.png', '/studio-nature.png'],
  },
  {
    id: 'avatar',
    icon: <UserCircle size={40} strokeWidth={1.5} />,
    title: 'Аватар и профиль',
    desc: 'Фото для аватарки, которое выглядит профессионально на любой платформе.',
    tag: 'Быстро',
    examples: ['/studio-glamour.png', '/studio-nature.png', '/studio-fashion.png'],
  },
];

export default function StylesPreview() {
  const [activeStyle, setActiveStyle] = useState<typeof photoStyles[0] | null>(null);

  const closeModal = () => setActiveStyle(null);

  return (
    <>
      <section className={`${styles.stylesSection} section section-light`} id="styles">
        <div className="container">
          <Reveal>
            <h2 className="section-title">
            Кадры, которые <span className="gradient-text">говорят за вас</span>
          </h2>
            <p className="section-subtitle">
              Будь то успешное резюме, профиль в дейтинг-приложении или яркий блог — 
              получите идеальный образ без долгих сборов и студий
            </p>
          </Reveal>

          <div className={styles.grid}>
            {photoStyles.map((style, i) => (
              <Reveal key={style.id} delay={i + 1}>
                <div 
                  className={`${styles.card} light-card`}
                  onClick={() => setActiveStyle(style)}
                >
                  <div className={styles.cardIcon}>{style.icon}</div>
                  <h3 className={styles.cardTitle}>{style.title}</h3>
                  <p className={styles.cardDesc}>{style.desc}</p>
                  <span className={styles.cardTag}>{style.tag}</span>
                  <div className={styles.viewExamples}>Смотреть примеры →</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={5}>
            <div className={styles.moreStylesContainer}>
              <p className={styles.moreStylesText}>И ещё 15+ направлений съёмки ждут вас внутри</p>
              <a href="/login" className="btn btn-primary">Смотреть все стили</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Modal Gallery Overlay */}
      {activeStyle && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={closeModal} aria-label="Закрыть">
              <X size={24} />
            </button>
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>{activeStyle.icon}</div>
              <h3 className={styles.modalTitle}>{activeStyle.title}</h3>
              <p className={styles.modalDesc}>{activeStyle.desc}</p>
            </div>
            
            <div className={styles.galleryGrid}>
              {activeStyle.examples.map((src, idx) => (
                <div key={idx} className={styles.galleryImageWrapper}>
                  <Image 
                    src={src} 
                    alt={`Пример фото ${activeStyle.title}`} 
                    fill 
                    className={styles.galleryImage}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
