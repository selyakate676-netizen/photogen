'use client';

import Image from 'next/image';
import styles from './Reviews.module.css';
import Reveal from './Reveal';

const useCases = [
  { title: 'Фото для социальных сетей', description: 'Серия кадров в едином стиле для профиля, публикаций и сторис.', image: '/dating-woman-2.png' },
  { title: 'Анкета для знакомств', description: 'Несколько живых портретов с разным настроением и композицией.', image: '/dating-woman-1.png' },
  { title: 'Личный бренд', description: 'Профессиональные образы для сайта эксперта, презентаций и блога.', image: '/social-woman-1.png' },
  { title: 'Деловой профиль', description: 'Спокойные современные портреты для резюме и рабочих аккаунтов.', image: '/ashley-1.png' },
];

export default function Reviews() {
  return (
    <section className="section section-light-alt" id="use-cases">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            Примеры <span className="gradient-text">использования</span>
          </h2>
          <p className="section-subtitle">
            Подберите фотосессию под личную или профессиональную задачу
          </p>
        </Reveal>

        <div className={styles.masonryGrid}>
          {useCases.map((item, idx) => (
            <Reveal key={item.title} delay={idx * 0.1}>
              <article className={`${styles.reviewCard} ${styles.imageCard}`}>
                <div className={styles.imageWrapper}>
                  <Image src={item.image} alt={item.title} fill className={styles.bgImage} sizes="(max-width: 768px) 100vw, 400px" />
                  <div className={styles.overlay}>
                    <div className={styles.overlayContent}>
                      <h3 className={styles.nameOnImage}>{item.title}</h3>
                      <p className={styles.textOnImage}>{item.description}</p>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
