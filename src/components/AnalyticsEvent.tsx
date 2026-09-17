'use client';

import { useEffect, useRef } from 'react';
import { trackAnalyticsGoal, type AnalyticsGoal, type AnalyticsParams } from '@/lib/analytics';

type AnalyticsEventProps = {
  goal: AnalyticsGoal;
  params?: AnalyticsParams;
  dedupeKey?: string;
};

export default function AnalyticsEvent({ goal, params = {}, dedupeKey }: AnalyticsEventProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    const storageKey = dedupeKey ? `photogen-analytics:${dedupeKey}` : null;
    const send = () => {
      if (sentRef.current) return;
      if (storageKey) {
        try {
          if (window.localStorage.getItem(storageKey)) {
            sentRef.current = true;
            return;
          }
        } catch {
          // Blocked storage must not affect the product flow.
        }
      }

      if (!trackAnalyticsGoal(goal, params)) return;
      sentRef.current = true;
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, 'sent');
        } catch {
          // Blocked storage must not affect the product flow.
        }
      }
    };

    send();
    window.addEventListener('photogen:analytics-consent', send);
    return () => window.removeEventListener('photogen:analytics-consent', send);
  }, [dedupeKey, goal, params]);

  return null;
}
