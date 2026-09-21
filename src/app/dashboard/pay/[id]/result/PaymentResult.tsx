'use client';

import Link from 'next/link';
import { Check, Clock3, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { decidePaymentPoll, type PaymentPollStatus } from '@/lib/payments/polling';
import styles from '../checkout.module.css';

type PaymentState = 'pending' | 'succeeded' | 'canceled' | 'error';

type PaymentPayload = {
  payment?: {
    photoshoot_id: string;
    status: 'pending' | 'succeeded' | 'canceled';
  };
  error?: string;
};

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 40;

export default function PaymentResult({ paymentId }: { paymentId: string }) {
  const [state, setState] = useState<PaymentState>('pending');
  const [photoshootId, setPhotoshootId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/status`, {
          cache: 'no-store',
        });
        const payload = await response.json() as PaymentPayload;
        if (!active) return;
        const payment = response.ok ? payload.payment : undefined;
        const decision = decidePaymentPoll(
          payment?.status as PaymentPollStatus | undefined ?? null,
          attempts,
          MAX_POLLS,
        );
        if (!active) return;

        if (payment) setPhotoshootId(payment.photoshoot_id);
        if (decision === 'succeeded') {
          setState('succeeded');
          return;
        }
        if (decision === 'canceled') {
          setState('canceled');
          return;
        }
        if (decision === 'error') {
          setState('error');
          return;
        }

        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!active) return;
        if (decidePaymentPoll(null, attempts, MAX_POLLS) === 'continue') {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setState('error');
        }
      }
    }

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [paymentId]);

  const view = {
    pending: {
      icon: <Clock3 className={styles.spinner} aria-hidden="true" />,
      title: 'Проверяем оплату',
      text: 'Подтверждение может занять немного времени. Не закрывайте страницу.',
    },
    succeeded: {
      icon: <Check aria-hidden="true" />,
      title: 'Оплата прошла',
      text: 'Фотосессия оплачена и передана в обработку.',
    },
    canceled: {
      icon: <X aria-hidden="true" />,
      title: 'Оплата не завершена',
      text: 'Деньги не списаны. Вы можете вернуться и выбрать способ оплаты ещё раз.',
    },
    error: {
      icon: <RotateCcw aria-hidden="true" />,
      title: 'Статус пока не получен',
      text: 'Проверьте заказ в «Моих генерациях» или повторите проверку позже.',
    },
  }[state];

  const paymentHref = photoshootId ? `/dashboard/pay/${photoshootId}` : '/account/generated';

  return (
    <div className={styles.resultWrap}>
      <section className={styles.resultCard} aria-live="polite">
        <span className={styles.resultIcon}>{view.icon}</span>
        <h1>{view.title}</h1>
        <p>{view.text}</p>
        {state === 'succeeded' ? (
          <div className={styles.resultActions}>
            <Link href="/account/generated" className={styles.primaryButton}>Перейти в мои генерации</Link>
          </div>
        ) : null}
        {state === 'canceled' ? (
          <div className={styles.resultActions}>
            <Link href={paymentHref} className={styles.primaryButton}>Вернуться к оплате</Link>
            <Link href="/account/generated" className={styles.secondaryLink}>Мои генерации</Link>
          </div>
        ) : null}
        {state === 'error' ? (
          <div className={styles.resultActions}>
            <button type="button" className={styles.primaryButton} onClick={() => window.location.reload()}>
              Проверить ещё раз
            </button>
            <Link href="/account/generated" className={styles.secondaryLink}>Мои генерации</Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
