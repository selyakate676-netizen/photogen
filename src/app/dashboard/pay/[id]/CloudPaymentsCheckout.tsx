'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './checkout.module.css';

type PaymentStatus = 'none' | 'pending' | 'succeeded' | 'failed';
type UiStatus = 'idle' | 'loading' | 'checking' | 'failed' | 'cancelled' | 'error';

type CheckoutPayload = {
  publicId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  accountId: string;
  description: string;
};

type CloudPaymentsWidget = {
  pay: (
    type: 'charge',
    options: CheckoutPayload,
    callbacks: {
      onSuccess: () => void;
      onFail: () => void;
      onComplete: (result: {
        success?: boolean;
        type?: 'cancel' | 'payment' | 'installment' | 'error';
        status?: 'success' | 'fail' | 'appointment' | 'reject' | 'cancel';
      }) => void;
    },
  ) => void;
};

declare global {
  interface Window {
    cp?: { CloudPayments: new () => CloudPaymentsWidget };
  }
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

export default function CloudPaymentsCheckout({
  photoshootId,
  initialPaymentStatus,
}: {
  photoshootId: string;
  initialPaymentStatus: PaymentStatus;
}) {
  const router = useRouter();
  const [widgetReady, setWidgetReady] = useState(false);
  const [uiStatus, setUiStatus] = useState<UiStatus>(
    initialPaymentStatus === 'failed' ? 'failed' : 'idle',
  );
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = useRef(0);
  const widgetCompletedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
  }, []);

  const pollStatus = useCallback(async () => {
    stopPolling();
    try {
      const response = await fetch(
        `/api/payments/cloudpayments/status?photoshootId=${encodeURIComponent(photoshootId)}`,
        { cache: 'no-store' },
      );
      const payload = await response.json() as {
        paymentStatus?: PaymentStatus;
        photoshootStatus?: string;
      };
      if (!response.ok) throw new Error('STATUS_FAILED');

      if (payload.paymentStatus === 'succeeded') {
        router.replace(`/account/generated?payment_completed=${encodeURIComponent(photoshootId)}`);
        router.refresh();
        return;
      }
      if (payload.paymentStatus === 'failed') {
        setUiStatus('failed');
        return;
      }
      if (payload.photoshootStatus && payload.photoshootStatus !== 'awaiting_payment') {
        router.replace('/account/generated');
        router.refresh();
        return;
      }

      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setUiStatus('error');
        return;
      }
      pollTimerRef.current = setTimeout(() => void pollStatus(), POLL_INTERVAL_MS);
    } catch {
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setUiStatus('error');
        return;
      }
      pollTimerRef.current = setTimeout(() => void pollStatus(), POLL_INTERVAL_MS);
    }
  }, [photoshootId, router, stopPolling]);

  useEffect(() => {
    if (initialPaymentStatus === 'pending') {
      pollAttemptsRef.current = 0;
      setUiStatus('checking');
      void pollStatus();
    }
    return stopPolling;
  }, [initialPaymentStatus, pollStatus, stopPolling]);

  const beginStatusCheck = useCallback(() => {
    pollAttemptsRef.current = 0;
    setUiStatus('checking');
    void pollStatus();
  }, [pollStatus]);

  const openCheckout = async () => {
    if (uiStatus === 'loading' || uiStatus === 'checking') return;
    if (!widgetReady || !window.cp?.CloudPayments) {
      setUiStatus('error');
      return;
    }

    setUiStatus('loading');
    widgetCompletedRef.current = false;
    try {
      const response = await fetch('/api/payments/cloudpayments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoshootId }),
      });
      const payload = await response.json() as CheckoutPayload & { error?: string };
      if (!response.ok) {
        if (response.status === 409) {
          beginStatusCheck();
          return;
        }
        throw new Error(payload.error ?? 'PAYMENT_CREATE_FAILED');
      }

      const widget = new window.cp.CloudPayments();
      widget.pay('charge', payload, {
        onSuccess: () => {
          widgetCompletedRef.current = true;
          beginStatusCheck();
        },
        onFail: () => {
          widgetCompletedRef.current = true;
          setUiStatus('failed');
        },
        onComplete: (result) => {
          if (result.success || result.status === 'success') {
            widgetCompletedRef.current = true;
            beginStatusCheck();
          } else if (result.type === 'cancel' || result.status === 'cancel') {
            setUiStatus('cancelled');
          } else if (result.type === 'error' || result.status === 'fail' || result.status === 'reject') {
            widgetCompletedRef.current = true;
            setUiStatus('failed');
          } else if (!widgetCompletedRef.current) {
            setUiStatus('cancelled');
          }
        },
      });
    } catch {
      setUiStatus('error');
    }
  };

  const isBusy = uiStatus === 'loading' || uiStatus === 'checking';
  const message = {
    idle: null,
    loading: 'Открываем защищённую форму оплаты…',
    checking: 'Проверяем оплату… Не закрывайте страницу.',
    failed: 'Оплата не прошла. Проверьте данные карты или попробуйте ещё раз.',
    cancelled: 'Оплата отменена или не завершена.',
    error: 'Не удалось подтвердить статус оплаты. Повторное нажатие безопасно продолжит этот же заказ.',
  }[uiStatus];

  return (
    <>
      <Script
        src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"
        strategy="afterInteractive"
        onLoad={() => setWidgetReady(Boolean(window.cp?.CloudPayments))}
        onError={() => setUiStatus('error')}
      />
      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={() => void openCheckout()}
        disabled={isBusy}
        aria-busy={isBusy}
      >
        {uiStatus === 'checking' ? 'Проверяем оплату…' : 'Оплатить банковской картой'}
      </button>
      {message ? <p className={styles.statusMessage} role="status">{message}</p> : null}
    </>
  );
}
