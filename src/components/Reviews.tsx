'use client';

import styles from './Reviews.module.css';
import Reveal from './Reveal';

const reviews = [
  {
    name: "Алексей С.",
    role: "Основатель стартапа",
    text: "Нужно было срочно обновить фото для интервью. Сгенерили за 20 минут. Журналисты даже не поняли, что это всё нейросеть.",
    initial: "А"
  },
  {
    name: "Марина В.",
    role: "UX/UI Дизайнер",
    text: "Идеально подошло для Тиндера. Искала естественные кадры без пафоса дорогих студий. Получилось супер, количество метчей выросло в 3 раза!",
    initial: "М"
  },
  {
    name: "Игорь Д.",
    role: "Product Manager",
    text: "Ненавижу фотографироваться. Загрузил старые фотки из отпуска и получил шикарные строгие деловые портреты для своего профиля.",
    initial: "И"
  }
];

export default function Reviews() {
  return (
    <section className="section" id="reviews">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            Реальные <span className="gradient-text">отзывы</span>
          </h2>
          <p className="section-subtitle">
            Вот что говорят те, кто уже получил свои первые фотографии от нашего AI
          </p>
        </Reveal>

        <div className={styles.grid}>
          {reviews.map((review, i) => (
            <Reveal key={i} delay={i + 1} className={styles.revealWrapper}>
              <div className={`${styles.card} light-card`}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.text}>"{review.text}"</p>
                <div className={styles.author}>
                  <div className={styles.avatar}>{review.initial}</div>
                  <div className={styles.authorInfo}>
                    <div className={styles.name}>{review.name}</div>
                    <div className={styles.role}>{review.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
