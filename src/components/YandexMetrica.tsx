'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import {
  canUseYandexMetrika,
  flushPendingAnalyticsGoals,
  shouldSendAnalyticsPageView,
  yandexMetrikaId,
} from '@/lib/analytics';

export default function YandexMetrica() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const lastPageViewRef = useRef<string | null>(null);
  const pageUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsAllowed(canUseYandexMetrika());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (
      !isAllowed
      || !isReady
      || !yandexMetrikaId
      || typeof window.ym !== 'function'
      || !shouldSendAnalyticsPageView(lastPageViewRef.current, pageUrl)
    ) return;

    try {
      window.ym(yandexMetrikaId, 'hit', pageUrl);
      lastPageViewRef.current = pageUrl;
    } catch {
      // A blocked analytics request must not affect navigation.
    }
  }, [isAllowed, isReady, pageUrl]);

  if (!isAllowed || !yandexMetrikaId) return null;

  return (
    <Script id="yandex-metrika" strategy="afterInteractive" onReady={() => {
      flushPendingAnalyticsGoals();
      setIsReady(true);
    }}>
      {`
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
        ym(${yandexMetrikaId},"init",{defer:true});
      `}
    </Script>
  );
}

/** @deprecated Use the typed trackAnalyticsGoal helper for new events. */
export function reachMetricaGoal(goal: 'SELECT_PLAN' | 'CREATE_PHOTOSHOOT') {
  void goal;
}
