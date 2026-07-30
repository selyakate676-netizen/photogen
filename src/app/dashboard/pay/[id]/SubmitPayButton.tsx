'use client';

import { useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { trackAnalyticsGoal } from '@/lib/analytics';

type SubmitPayButtonProps = {
  packageSlug: string;
};

export default function SubmitPayButton({ packageSlug }: SubmitPayButtonProps) {
  const { pending } = useFormStatus();
  const generationStartedSentRef = useRef(false);

  useEffect(() => {
    if (!pending || generationStartedSentRef.current) return;
    generationStartedSentRef.current = true;
    trackAnalyticsGoal('generation_started', {
      package_slug: packageSlug,
      order_status: 'starting',
      source_page: 'checkout',
      is_test_mode: true,
    });
  }, [packageSlug, pending]);

  return (
    <button
      type="submit"
      className="btn btn-primary btn-lg"
      style={{ minWidth: '250px', cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1 }}
      disabled={pending}
      onClick={() => trackAnalyticsGoal('mock_payment_click', {
        package_slug: packageSlug,
        order_status: 'pending',
        source_page: 'checkout',
        is_test_mode: true,
      })}
    >
      {pending ? 'Запуск генерации...' : 'Оплатить (эмуляция)'}
    </button>
  );
}
