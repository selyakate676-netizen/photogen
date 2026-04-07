import styles from './Templates.module.css';
import Reveal from './Reveal';

const templates = [
  {
    id: 1,
    title: 'Ретро Кинематограф',
    desc: 'Винтажная обработка, пленочное зерно и ностальгическая цветокоррекция.',
    src: '/ref-vintage.png',
  },
  {
    id: 2,
    title: 'Неоновый киберпанк',
    desc: 'Драматичное раздельное освещение с яркими цветами для соцсетей.',
    src: '/ref-neon.png',
  },
  {
    id: 3,
    title: 'Золотой час',
    desc: 'Теплые лучи солнца сквозь жалюзи для идеального бьюти-портрета.',
    src: '/ref-golden.png',
  },
  {
    id: 4,
    title: 'Fine Art Noir',
    desc: 'Резкие тени и контрастное ч/б в стиле обложек глянцевых журналов.',
    src: '/ref-bw-blinds.png',
  },
];

export default function Templates() {
  return (
    <section className={`${styles.templates} section section-dark`} id="templates">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            Идеи для <span className="gradient-text">вдохновения</span>
          </h2>
          <p className="section-subtitle">
            Мы не просто меняем лицо. Мы переносим вас в лучшие работы мировых фотографов
          </p>
        </Reveal>

        <div className={styles.grid}>
          {templates.map((tpl, i) => (
            <Reveal key={tpl.id} delay={i * 1.5} className={styles.cardWrapper}>
              <div className={styles.card}>
                <div className={styles.imageContainer}>
                  <img src={tpl.src} alt={tpl.title} className={styles.image} />
                </div>
                <div className={styles.content}>
                  <h3 className={styles.cardTitle}>{tpl.title}</h3>
                  <p className={styles.cardDesc}>{tpl.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
