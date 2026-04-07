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
    title: 'В парке',
    src: '/studio-red-light-v2.png',
  },
  {
    id: 6,
    title: 'Студийный свет',
    src: '/ref-golden.png',
  },
];

export default function Templates() {
  return (
    <section className={`${styles.templates} section section-dark`} id="templates">
      <div className="container">
        </Reveal>
      </div>

      <div className={styles.scrollContainer}>
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
    </section>
  );
}
