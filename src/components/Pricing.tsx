import styles from './Pricing.module.css';
import Reveal from './Reveal';

const plans = [
  {
    name: 'Базовый',
    photos: '10 фото',
    price: 490,
    desc: 'Идеально для теста и одной соцсети',
    popular: false,
    features: [
      '10 AI-фотографий',
      '1 направление на выбор',
      'Высокое разрешение',
      'Готовность ~15 минут',
      'Скачивание в PNG',
    ],
  },
  {
    name: 'Оптимал',
    photos: '30 фото',
    price: 990,
    popular: true,
    features: [
      '30 AI-фотографий',
      'До 3 направлений',
      'Высокое разрешение',
      'Приоритетная очередь',
      'PNG + JPG форматы',
      'Повторная генерация',
    ],
  },
  {
    name: 'Максимум',
    photos: '50 фото',
    price: 1490,
    popular: false,
    features: [
      '50 AI-фотографий',
      'Все направления',
      'Максимальное разрешение',
      'Приоритетная очередь',
      'Все форматы скачивания',
      '3 повторные генерации',
      'Ручная ретушь',
    ],
  },
];

export default function Pricing() {
  return (
    <section className={`${styles.pricing} section section-dark-alt`} id="pricing">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            В 5–10 раз <span className="gradient-text">дешевле</span> фотографа
          </h2>
          <p className="section-subtitle">
            Один платёж — без подписок и скрытых комиссий. 
            Профессиональная съёмка обходится от 5 000 ₽, у нас — от 500 ₽
          </p>
        </Reveal>

        <div className={styles.plans}>
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i + 1}>
              <div
                className={`${styles.plan} glass-card ${
                  plan.popular ? styles.planPopular : ''
                }`}
              >
                {plan.popular && (
                  <span className={styles.popularBadge}>Лучший выбор</span>
                )}
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planPhotos}>{plan.photos}</p>
                <div className={styles.planPrice}>
                  {plan.price.toLocaleString('ru-RU')}
                  <span className={styles.planCurrency}> ₽</span>
                </div>
                <p className={styles.planPer}>разовый платёж</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button
                  className={`btn ${
                    plan.popular ? 'btn-primary' : 'btn-secondary'
                  } ${styles.planBtn}`}
                  id={`plan-${plan.name.toLowerCase()}`}
                >
                  Выбрать
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
