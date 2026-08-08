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
    if (sentRef.current) return;
    const storageKey = dedupeKey ? `photogen-analytics:${dedupeKey}` : null;
    if (storageKey) {
      try {
        if (window.sessionStorage.getItem(storageKey)) {
          sentRef.current = true;
          return;
        }
      } catch {
        // Blocked storage must not affect the product flow.
      }
    }

    sentRef.current = true;
    trackAnalyticsGoal(goal, params);
    if (storageKey) {
      try {
        window.sessionStorage.setItem(storageKey, 'sent');
      } catch {
        // Blocked storage must not affect the product flow.
      }
    }
  }, [dedupeKey, goal, params]);

  return null;
}