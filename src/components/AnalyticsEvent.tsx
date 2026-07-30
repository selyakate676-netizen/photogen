'use client';

import { useEffect, useRef } from 'react';
import { trackAnalyticsGoal, type AnalyticsGoal, type AnalyticsParams } from '@/lib/analytics';

type AnalyticsEventProps = {
  goal: AnalyticsGoal;
  params?: AnalyticsParams;
};

export default function AnalyticsEvent({ goal, params = {} }: AnalyticsEventProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    trackAnalyticsGoal(goal, params);
  }, [goal, params]);

  return null;
}