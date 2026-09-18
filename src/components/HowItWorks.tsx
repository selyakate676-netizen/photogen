/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Images, LogIn, UserRound } from 'lucide-react';
import styles from './HowItWorks.module.css';

export type HowItWorksCtaState = 'guest' | 'needs-persona' | 'ready';

export function resolveHowItWorksCta(state: HowItWorksCtaState) {
  if (state === 'needs-persona') return { href: '/account/profile', label: 'Создать профиль' };
  if (state === 'ready') return { href: '/catalog', label: 'Выбрать фотосессию' };
  return { href: '/signup', label: 'Начать' };
}

const steps = [
  {
    icon: LogIn,
    title: 'Войдите или зарегистрируйтесь',
    description: 'Создайте аккаунт, чтобы сохранить профиль и фотосессии.',
    cta: 'Войти / зарегистрироваться',
    href: '/login',
    visuals: ['/selfie-2.png', '/selfie-3.png'],
  },
  {
    icon: UserRound,
    title: 'Создайте профиль',
    description: 'Загрузите свои обычные фотографии и заполните короткую анкету.',
    cta: 'Создать профиль',
    href: '/account/profile',
    visuals: ['/selfie-2.png', '/before-main.png'],
  },
  {
    icon: Images,
    title: 'Выберите фотосессию и получите AI-фото',
    description: 'Выберите подходящий фотопак — готовые снимки появятся в вашей студии после генерации.',
    cta: 'Выбрать фотосессию',
    href: '/catalog',
    visuals: ['/studio-glamour.png', '/studio-nature.png'],
  },
] as const;

export default function HowItWorks({ ctaState = 'guest' }: { ctaState?: HowItWorksCtaState }) {
  void ctaState;
  return (
    <section className={`${styles.howItWorks} section section-dark-alt`} id="how-it-works">
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>Как это работает</h2>
          <p className={styles.subtitle}>Три простых шага до вашей AI-фотосессии</p>
        </header>
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li className={styles.step} key={step.title}>
                <div className={styles.stepTopline}><span>{index + 1}</span>{index < 3 ? <i aria-hidden="true" /> : null}</div>
                <div className={styles.visual} aria-hidden="true">
                  <Icon className={styles.visualIcon} />
                  {step.visuals.map((src) => <img src={src} alt="" key={src} />)}
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <Link href={step.href} className={'btn btn-primary ' + styles.cta}>{step.cta}</Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
