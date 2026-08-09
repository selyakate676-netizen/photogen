'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { canUseYandexMetrika, flushPendingAnalyticsGoals, yandexMetrikaId } from '@/lib/analytics';

export default function YandexMetrika() {
  const [consentRevision, setConsentRevision] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const pageUrl = query ? `${pathname}?${query}` : pathname;

  useEffect(() => {
    const handleConsent = () => setConsentRevision((revision) => revision + 1);
    window.addEventListener('photogen:analytics-consent', handleConsent);
    return () => window.removeEventListener('photogen:analytics-consent', handleConsent);
  }, []);

  useEffect(() => {
    flushPendingAnalyticsGoals();
    if (!canUseYandexMetrika() || !yandexMetrikaId || typeof window.ym !== 'function' || window.__photogenMetrikaPageUrl === pageUrl) return;
    window.__photogenMetrikaPageUrl = pageUrl;
    try { window.ym(yandexMetrikaId, 'hit', pageUrl); } catch { /* Analytics must never affect navigation. */ }
  }, [consentRevision, pageUrl]);

  return null;
}

/** @deprecated Use the typed trackAnalyticsGoal helper for new events. */
export function reachMetricaGoal(goal: 'SELECT_PLAN' | 'CREATE_PHOTOSHOOT') { void goal; }
