'use client';

import Image from 'next/image';
import styles from './Reviews.module.css';
import Reveal from './Reveal';

const reviewsData = [
  {
    type: 'image',
    name: 'Карина',
    text: 'Это просто находка! Заменила все свои старые селфи на профильные кадры. Теперь профиль в соцсетях выглядит как после дорогой съемки в кафе или за границей. Очень естественно! ✨',
    image: '/dating-woman-2.png',
    stars: 5,
  },
  {
    type: 'text',
    name: 'Екатерина М.',
    text: 'Я просто в восторге от качества! Не могла остановиться, пока не примерила все образы: от бизнес-леди до лайфстайла. Теперь у меня есть крутой контент на месяцы вперед, и всё это за копейки. Всем советую попробовать! 🚀',
    stars: 5,
  },
  {
    type: 'image',
    name: 'Юлия',
    text: 'Нет слов, одни эмоции! Как нейросеть так точно передает мой взгляд? Это реально будущее. Теперь не нужно мучиться с выбором студии и визажиста. 📸',
    image: '/ashley-1.png',
  },
  {
    type: 'image',
    name: 'Алена',
    text: 'Нужны были профессиональные фото для экспертного блога, но не хотелось отдавать 20-30к за один раз. С PhotoGen сделала всё за 15 минут. Результат — пушка! 🔥',
    image: '/social-woman-1.png',
    stars: 5,
  },
  {
    type: 'text',
    name: 'Артем',
    role: 'Product Manager',
    text: 'Обновил фото в LinkedIn и рабочих мессенджерах. Коллеги даже не заподозрили подвоха, спрашивали, у какого фотографа снимался. Свет и детализация на высоте!',
    stars: 5,
  },
  {
    type: 'image',
    name: 'Мария',
    text: 'Смотрите, какую эстетику мне выдал сервис! 😍 Идеально для сторис и аватарок. Совсем не выглядит как «компьютерная графика», очень живые и теплые кадры.',
    image: '/dating-woman-1.png',
    stars: 5,
  },
];

export default function Reviews() {
  return (
    <section className="section section-light-alt" id="reviews">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            Реальные <span className="gradient-text">истории</span>
          </h2>
          <p className="section-subtitle">Посмотрите, как наши пользователи преобразили свои профили</p>
        </Reveal>

        <div className={styles.masonryGrid}>
          {reviewsData.map((review, idx) => (
            <Reveal key={idx} delay={idx * 0.1}>
              <div className={`${styles.reviewCard} ${review.type === 'text' ? styles.textCard : styles.imageCard}`}>
                {review.type === 'image' ? (
                  <div className={styles.imageWrapper}>
                    <Image
                      src={review.image as string}
                      alt={review.name}
                      fill
                      className={styles.bgImage}
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                    <div className={styles.overlay}>
                      <div className={styles.overlayContent}>
                        <span className={styles.nameOnImage}>{review.name}</span>
                        {review.stars && <div className={styles.stars}>{'★'.repeat(review.stars)}</div>}
                        <p className={styles.textOnImage}>«{review.text}»</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardPadding}>
                    <div className={styles.authorHeader}>
                      <div className={styles.avatarPlaceholder}>{review.name.charAt(0)}</div>
                      <div className={styles.authorMeta}>
                        <span className={styles.name}>{review.name}</span>
                        {review.stars && <div className={styles.stars}>{'★'.repeat(review.stars)}</div>}
                      </div>
                    </div>
                    <p className={styles.reviewText}>{review.text}</p>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
