import { ImageUp, SlidersHorizontal, Sparkles } from 'lucide-react';
import styles from './HowItWorks.module.css';
import Reveal from './Reveal';

const steps = [
  {
    number: 1,
    icon: <ImageUp size={36} strokeWidth={1.5} />,
    title: 'Загрузите фото',
    desc: 'Загрузите 10–20 обычных фотографий с телефона. AI научится узнавать именно вас.',
  },
  {
    number: 2,
    icon: <SlidersHorizontal size={36} strokeWidth={1.5} />,
    title: 'Выберите стиль',
    desc: 'Деловой портрет, фото для соцсетей, сайта знакомств или аватарки — выберите то, что нужно.',
  },
  {
    number: 3,
    icon: <Sparkles size={36} strokeWidth={1.5} />,
    title: 'Получите результат',
    desc: 'Через 15 минут — реалистичные фото, которые не отличить от работы профессионального фотографа.',
  },
];

export default function HowItWorks() {
  return (
    <section className={`${styles.howItWorks} section section-dark-alt`} id="how-it-works">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            Как это <span className="gradient-text">работает</span>
          </h2>
          <p className="section-subtitle">
            Три простых шага — и ваши фото готовы
          </p>
        </Reveal>

        <div className={styles.steps}>
          {steps.map((step, index) => (
            <Reveal key={index} delay={index + 1} className={styles.revealWrapper}>
              <div className={`${styles.step} glass-card`}>
                <div className={styles.stepNumber}>{step.number}</div>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={4} className={styles.mockupReveal}>
          <div className={styles.mockupWrapper}>
            <div className={styles.mockupGlow} />
            <img 
              src="/app-mockup.png" 
              alt="Интерфейс панели управления PhotoGen" 
              className={styles.mockupImage} 
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
