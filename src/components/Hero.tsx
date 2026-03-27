import styles from './Hero.module.css';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className={styles.hero} id="hero">
      <div className={styles.heroContent}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Реалистичные AI-фото
        </div>

        <h1 className={styles.heroTitle}>
          <span className="gradient-text">Фотосессия</span>
          <br />
          без дорогой студии и фотографа
        </h1>

        <p className={styles.heroSubtitle}>
          Это вы, только фотогеничнее. Загрузите обычные фото с&nbsp;телефона — 
          получите результат, неотличимый от&nbsp;профессиональной съёмки
        </p>

        <div className={styles.heroActions}>
          <Link href="/login" className="btn btn-primary btn-lg" id="cta-main">
            ✨ Попробовать от 490 ₽
          </Link>
          <a href="#styles" className="btn btn-secondary btn-lg" id="cta-how">
            Смотреть примеры
          </a>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>от 490 ₽</div>
            <div className={styles.statLabel}>В 10 раз дешевле фотографа</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>~15 мин</div>
            <div className={styles.statLabel}>Время готовности</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>99%</div>
            <div className={styles.statLabel}>Реалистичность</div>
          </div>
        </div>
      </div>
    </section>
  );
}
