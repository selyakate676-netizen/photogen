'use client';

import { useEffect, useState } from 'react';
import {
  canUseYandexMetrika,
  flushPendingAnalyticsGoals,
  getAnalyticsConsent,
  setAnalyticsConsent,
  shouldInitializeYandexMetrika,
  yandexMetrikaId,
  type AnalyticsConsent,
  type MetrikaFunction,
} from '@/lib/analytics';
import styles from './YandexMetrikaBootstrap.module.css';

function initializeYandexMetrika() {
  const counterId = yandexMetrikaId;
  if (!counterId || !shouldInitializeYandexMetrika(
    getAnalyticsConsent(),
    counterId,
    window.location.hostname,
    Boolean(window.__photogenMetrikaInitialized),
  ) || !canUseYandexMetrika()) return;

  window.__photogenMetrikaInitialized = true;
  if (!window.ym) {
    const queue = ((...args: unknown[]) => {
      queue.a = queue.a || [];
      queue.a.push(args);
    }) as MetrikaFunction;
    queue.l = Date.now();
    window.ym = queue;
  }

  const currentPageUrl = window.location.pathname + window.location.search;
  window.__photogenMetrikaPageUrl = currentPageUrl;
  window.ym(counterId, 'init', { defer: true });
  window.ym(counterId, 'hit', currentPageUrl);

  function loadMetrikaTag() {
    if (document.querySelector('script[data-yandex-metrika-tag]')) return;
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://mc.yandex.ru/metrika/tag.js';
    tag.dataset.yandexMetrikaTag = 'true';
    document.head.appendChild(tag);
  }

  if (document.readyState === 'complete') loadMetrikaTag();
  else window.addEventListener('load', loadMetrikaTag, { once: true });

  flushPendingAnalyticsGoals();
  window.dispatchEvent(new Event('photogen:analytics-consent'));
}

export default function YandexMetrikaBootstrap() {
  const [consent, setConsent] = useState<AnalyticsConsent | null | undefined>(undefined);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setConsent(getAnalyticsConsent()), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);
  useEffect(() => { if (consent === 'granted') initializeYandexMetrika(); }, [consent]);

  if (consent !== null) return null;

  return (
    <aside className={styles.banner} aria-label="Настройки аналитических cookie">
      <p>Мы используем файлы cookie и Яндекс Метрику для аналитики и улучшения сервиса.</p>
      <div className={styles.actions}>
        <button className={styles.allowButton} type="button" onClick={() => {
          setAnalyticsConsent('granted');
          setConsent('granted');
        }}>Разрешить</button>
        <button className={styles.rejectButton} type="button" onClick={() => {
          setAnalyticsConsent('denied');
          setConsent('denied');
        }}>Отклонить</button>
      </div>
    </aside>
  );
}
