/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Check, Images, LogIn, UserRound } from 'lucide-react';
import styles from './HowItWorks.module.css';

export type HowItWorksCtaState = 'guest' | 'needs-persona' | 'ready';

export function resolveHowItWorksCta(state: HowItWorksCtaState) {
  if (state === 'needs-persona') return { href: '/account/profile', label: 'Создать профиль' };
  if (state === 'ready') return { href: '/catalog', label: 'Выбрать фотосессию' };
  return { href: '/signup', label: 'Начать' };
}

const steps = [
  { icon: LogIn, title: 'Войдите или зарегистрируйтесь', description: 'Создайте аккаунт, чтобы сохранить профиль и фотосессии.' },
  { icon: UserRound, title: 'Создайте профиль', description: 'Загрузите свои обычные фотографии и заполните короткую анкету.' },
  { icon: Images, title: 'Выберите фотосессию', description: 'Откройте каталог и выберите подходящий фотопак.' },
  { icon: Check, title: 'Получите готовые AI-фото', description: 'Результаты появятся в вашем аккаунте после генерации.' },
] as const;

const visuals = [
  ['/selfie-2.png', '/selfie-3.png'],
  ['/selfie-2.png', '/before-main.png'],
  ['/studio-glamour.png', '/studio-fashion.png'],
  ['/studio-nature.png', '/studio-red-light-v2.png'],
];

export default function HowItWorks({ ctaState = 'guest' }: { ctaState?: HowItWorksCtaState }) {
  const cta = resolveHowItWorksCta(ctaState);
  return (
    <section className={`${styles.howItWorks} section section-dark-alt`} id="how-it-works">
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>Как это работает</h2>
          <p className={styles.subtitle}>Четыре простых шага до вашей профессиональной фотосессии</p>
        </header>
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li className={styles.step} key={step.title}>
                <div className={styles.stepTopline}><span>{index + 1}</span>{index < 3 ? <i aria-hidden="true" /> : null}</div>
                <div className={styles.visual} aria-hidden="true">
                  <Icon className={styles.visualIcon} />
                  {visuals[index].map((src) => <img src={src} alt="" key={src} />)}
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            );
          })}
        </ol>
        <div className={styles.footerAction}><Link href={cta.href} className={`btn btn-primary ${styles.cta}`}>{cta.label}</Link></div>
      </div>
    </section>
  );
}
