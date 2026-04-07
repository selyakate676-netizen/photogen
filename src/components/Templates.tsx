import styles from './Templates.module.css';
import Reveal from './Reveal';

const templates = [
  {
    id: 1,
    title: 'Ретро Кинематограф',
    desc: 'Винтажная обработка, пленочное зерно.',
    src: '/ref-vintage.png',
  },
  {
    id: 2,
    title: 'Неоновый киберпанк',
    desc: 'Драматичное раздельное освещение.',
    src: '/ref-neon.png',
  },
  {
    id: 3,
    title: 'Золотой час',
    desc: 'Теплые лучи солнца сквозь жалюзи.',
    src: '/ref-golden.png',
  },
  {
    id: 4,
    title: 'Fine Art Noir',
    desc: 'Резкие тени и контрастное ч/б.',
    src: '/ref-bw-blinds.png',
  },
  {
    id: 5,
    title: 'Business Editorial',
    desc: 'Стильный деловой портрет.',
    src: '/studio-red-light-v2.png',
  },
  {
    id: 6,
    title: 'Studio Glow',
    desc: 'Минималистичный студийный свет.',
    src: '/ref-golden.png',
  },
  {
    id: 7,
    title: 'Cinematic Red',
    desc: 'Атмосферный красный свет.',
    src: '/ref-neon.png',
  },
  {
    id: 8,
    title: 'Old Money',
    desc: 'Классический люксовый портрет.',
    src: '/ref-vintage.png',
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
        </Reveal>

        <div className={styles.scrollContainer}>
          <div className={styles.grid}>
            {templates.map((tpl, i) => (
              <Reveal key={tpl.id} delay={i * 1.5} className={styles.cardWrapper}>
                <div className={styles.card}>
                  <img src={tpl.src} alt={tpl.title} className={styles.image} />
                  <div className={styles.overlay}>
                    <h3 className={styles.cardTitle}>{tpl.title}</h3>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
