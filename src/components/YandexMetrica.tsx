'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  canUseYandexMetrika,
  flushPendingAnalyticsGoals,
  shouldSendAnalyticsPageView,
  yandexMetrikaId,
} from '@/lib/analytics';

export default function YandexMetrica() {
  const pathname = usePathname();

  useEffect(() => {
    if (!canUseYandexMetrika() || !yandexMetrikaId) return;

    flushPendingAnalyticsGoals();

    const pageUrl = `${pathname}${window.location.search}`;
    const previousPageUrl = document.documentElement.dataset.metrikaPageUrl ?? null;

    if (!previousPageUrl) {
      document.documentElement.dataset.metrikaPageUrl = pageUrl;
      return;
    }

    if (
      typeof window.ym !== 'function'
      || !shouldSendAnalyticsPageView(previousPageUrl, pageUrl)
    ) return;

    try {
      window.ym(yandexMetrikaId, 'hit', pageUrl);
      document.documentElement.dataset.metrikaPageUrl = pageUrl;
    } catch {
      // A blocked analytics request must not affect navigation.
    }
  }, [pathname]);

  return <span hidden aria-hidden="true" data-yandex-metrika-router-tracker="" />;
}

/** @deprecated Use the typed trackAnalyticsGoal helper for new events. */
export function reachMetricaGoal(goal: 'SELECT_PLAN' | 'CREATE_PHOTOSHOOT') {
  void goal;
}
