'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  canUseYandexMetrika,
  flushPendingAnalyticsGoals,
  shouldSendAnalyticsPageView,
  yandexMetrikaId,
} from '@/lib/analytics';

const BOOTSTRAP_SCRIPT_ID = 'yandex-metrika';

export default function YandexMetrica() {
  const pathname = usePathname();

  useEffect(() => {
    if (!canUseYandexMetrika() || !yandexMetrikaId) return;

    const pageUrl = `${pathname}${window.location.search}`;
    const existingScript = document.getElementById(BOOTSTRAP_SCRIPT_ID);

    if (!existingScript) {
      const bootstrapScript = document.createElement('script');
      bootstrapScript.id = BOOTSTRAP_SCRIPT_ID;
      bootstrapScript.text = `
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
        ym(${yandexMetrikaId},"init",{defer:true});
      `;
      document.head.appendChild(bootstrapScript);
      document.documentElement.dataset.metrikaPageUrl = pageUrl;
      flushPendingAnalyticsGoals();
      return;
    }

    flushPendingAnalyticsGoals();

    const previousPageUrl = document.documentElement.dataset.metrikaPageUrl ?? null;
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

  return null;
}

/** @deprecated Use the typed trackAnalyticsGoal helper for new events. */
export function reachMetricaGoal(goal: 'SELECT_PLAN' | 'CREATE_PHOTOSHOOT') {
  void goal;
}
