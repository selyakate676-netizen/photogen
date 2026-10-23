'use client';

import Image from 'next/image';
import styles from './Reviews.module.css';
import Reveal from './Reveal';

const useCases = [
  {
    name: 'Татьяна',
    title: 'Это действительно я, только фотогеничная',
    description: 'Обычно на AI-фото я похожа на дальнюю родственницу. А здесь посмотрела и подумала: это действительно я, только фотогеничная.',
    image: '/jtbd-stories/01_recognition_cafe.png',
  },
  {
    name: 'Ольга',
    title: 'Без гламура и странных поз',
    description: 'Не хотела гламурных фотосессий, где все сидят на корточках с загадочным лицом. Нужны были просто красивые, живые фото. Такие и получились.',
    image: '/jtbd-stories/02_no_glamour_park.png',
  },
  {
    name: 'Евгения',
    title: 'Для резюме и рабочих аватарок',
    description: 'Искала работу и поняла, что нормальной фотографии для резюме и аватарок в Telegram и ВК у меня нет. Теперь есть несколько вариантов, и не пришлось идти в студию.',
    image: '/jtbd-stories/03_work_avatar_bench.png',
  },
  {
    name: 'Марина',
    title: 'Для сайта знакомств',
    description: 'Хотела обновить фотографии для сайта знакомств, но боялась, что нейросеть сделает из меня куклу. А получилась именно я — с хорошим светом, красивым макияжем и без ощущения, что на фото совершенно другой человек.',
    image: '/jtbd-stories/04_dating_cardigan.png',
  },
  {
    name: 'Ксения',
    title: 'Реальные люди, а не модели',
    description: 'Везде показывают идеальных моделей. А мне хотелось увидеть, как такие фотографии выглядят на обычном человеке. Здесь наконец нашла то, что искала.',
    image: '/jtbd-stories/05_real_people_autumn.png',
  },
];

export default function Reviews() {
  return (
    <section className="section section-light-alt" id="use-cases">
      <div className="container">
        <Reveal>
          <p className={styles.eyebrow}>Примеры использования PhotoGen</p>
          <h2 className="section-title">Это действительно я. Только фотогеничная.</h2>
          <p className="section-subtitle">
            Хорошие фотографии нужны не только для особых случаев. Иногда — чтобы обновить аватарку, найти работу или просто понравиться себе в кадре.
          </p>
        </Reveal>

        <div className={styles.railFrame}>
          <div className={styles.reviewRail} aria-label="Примеры задач пользователей">
            {useCases.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.1} className={styles.cardReveal}>
                <article className={styles.reviewCard}>
                  <header className={styles.authorHeader}>
                    <Image
                      src={item.image}
                      alt=""
                      width={64}
                      height={64}
                      className={styles.avatar}
                      sizes="64px"
                    />
                    <div>
                      <p className={styles.name}>{item.name}</p>
                      <h3 className={styles.cardTitle}>{item.title}</h3>
                    </div>
                  </header>
                  <p className={styles.reviewText}>{item.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}