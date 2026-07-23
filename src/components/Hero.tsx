import Link from 'next/link';
import ImageSlider from './ImageSlider';
import styles from './Hero.module.css';

type BenefitIcon = 'sparkle' | 'shirt' | 'bolt';

const heroBenefits: Array<{ icon: BenefitIcon; title: string; text: string }> = [
  {
    icon: 'sparkle',
    title: 'Реалистичные фото',
    text: 'как после профессиональной съёмки',
  },
  {
    icon: 'shirt',
    title: 'Разные образы',
    text: 'для любого настроения',
  },
  {
    icon: 'bolt',
    title: 'Быстро и просто',
    text: 'результат за несколько минут',
  },
];

function CaptionSparkle() {
  return (
    <svg className={styles.heroSliderCaptionIcon} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10 2.5 11.75 7.85 17.1 9.6 11.75 11.35 10 16.7 8.25 11.35 2.9 9.6 8.25 7.85 10 2.5Z" />
    </svg>
  );
}

function BenefitIcon({ name }: { name: BenefitIcon }) {
  const iconProps = {
    className: styles.heroBenefitIcon,
    viewBox: '0 0 32 32',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  } as const;

  if (name === 'sparkle') {
    return (
      <svg {...iconProps}>
        <path d="M16 3.5 18.9 12.1 27.5 15 18.9 17.9 16 26.5 13.1 17.9 4.5 15 13.1 12.1 16 3.5Z" />
        <path d="M24.5 4.5 25.7 8.3 29.5 9.5 25.7 10.7 24.5 14.5 23.3 10.7 19.5 9.5 23.3 8.3 24.5 4.5Z" />
      </svg>
    );
  }

  if (name === 'shirt') {
    return (
      <svg {...iconProps}>
        <path d="M11.4 5.5c1.2 1.1 2.7 1.7 4.6 1.7s3.4-.6 4.6-1.7" />
        <path d="M11.4 5.5 5.7 8.2l2.1 6 3.2-1.1v13.4h10V13.1l3.2 1.1 2.1-6-5.7-2.7" />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <path d="M18.7 3.8 8.6 17.2h7l-2.3 11 10.1-13.4h-7l2.3-11Z" />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className={styles.hero} id="hero">
      <div className={`container ${styles.heroLayout}`}>
        <div className={styles.heroContent}>
          <div className={styles.heroSliderCaption}>
            <CaptionSparkle />
            <span>1 селфи → целая профессиональная фотосессия</span>
          </div>

          <h1 className={styles.heroTitle}>
            <span className="gradient-text">Фотосессия</span>
            <br />
            без дорогой студии и фотографа
          </h1>

          <p className={styles.heroSubtitle}>
            Это вы, только фотогеничнее. Загрузите обычные фото с&nbsp;телефона — получите результат, неотличимый от&nbsp;профессиональной съёмки
          </p>

          <div className={styles.heroActions}>
            <Link href="/login" className="btn btn-primary btn-lg" id="cta-main">
              Попробовать реалистичные AI-фото
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Сравнение одного селфи и результата фотосессии">
          <div className={styles.sliderFrame}>
            <ImageSlider
              beforeImages={["/selfie-2.png"]}
              afterImages={["/studio-glamour.png", "/studio-fashion.png", "/studio-nature.png", "/studio-red-light-v2.png"]}
              beforeLabel=""
              afterLabel=""
              autoPlay
              variant="hero"
            />
          </div>

          <div className={styles.heroBenefits} aria-label="Преимущества PhotoGen">
            {heroBenefits.map((benefit) => (
              <div className={styles.heroBenefit} key={benefit.title}>
                <BenefitIcon name={benefit.icon} />
                <div className={styles.heroBenefitCopy}>
                  <div className={styles.heroBenefitTitle}>{benefit.title}</div>
                  <div className={styles.heroBenefitText}>{benefit.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}