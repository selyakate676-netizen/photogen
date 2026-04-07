import Link from 'next/link';
import styles from './FinalCTA.module.css';
import Reveal from './Reveal';

export default function FinalCTA() {
  return (
    <section className="section" id="cta">
      <div className="container">
        <Reveal>
          <div className={`${styles.ctaCard} light-card`}>
            <div className={styles.content}>
              <h2 className={styles.title}>Твоя идеальная фотосессия начинается здесь</h2>
              <p className={styles.subtitle}>
                Создайте свой идеальный образ за 15 минут. Никаких студий, визажистов и сложных промптов.
              </p>
              <Link href="/login" className="btn btn-primary btn-lg">
                Начать фотосессию
              </Link>
            </div>
            {/* Ambient glow decoration */}
            <div className={styles.blob}></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
