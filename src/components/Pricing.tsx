'use client';

import styles from './Pricing.module.css';
import Reveal from './Reveal';
import { reachMetricaGoal } from './YandexMetrica';

const plans = [
  {
    name: 'Solo',
    price: 490,
    photos: '20 фото',
    features: [
      '1 образ для обучения',
      'Базовая генерация',
      'Доступ 24/7',
    ],
  },
  {
    name: 'Pro',
    price: 1490,
    photos: '60 фото',
    popular: true,
    features: [
      '3 разных образа',
      'Приоритетный рендеринг',
      'Улучшенная детализация',
      'Все стили доступны',
    ],
  },
  {
    name: 'Max',
    price: 2990,
    photos: '150 фото',
    features: [
      '10 образов для обучения',
      'Максимальное качество',
      'VIP поддержка',
      'Генерация без очереди',
    ],
  },
];

export default function Pricing() {
  const handleSelect = (planName: string) => {
    reachMetricaGoal('SELECT_PLAN');
    // Можно добавить специфичную цель для каждого тарифа, если нужно:
    // reachMetricaGoal(`SELECT_PLAN_${planName.toUpperCase()}`);
  };

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
                  onClick={() => handleSelect(plan.name)}
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
