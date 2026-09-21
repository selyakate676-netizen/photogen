'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CreditCard, Diamond, Landmark } from 'lucide-react';
import { trackAnalyticsGoal } from '@/lib/analytics';
import type { PaymentMethod } from '@/lib/payments/types';
import { useCrystalWallet } from '@/lib/wallet/useCrystalWallet';
import { payWithCrystals } from './actions';
import SubmitPayButton from './SubmitPayButton';
import styles from './checkout.module.css';

type CheckoutPanelProps = {
  photoshootId: string;
  packageSlug: string;
  priceRub: number;
  priceCrystals: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_METHOD_CONFLICT: 'Для заказа уже создана оплата другим способом. Обновите страницу и повторите попытку.',
  PHOTOSHOOT_NOT_PAYABLE: 'Этот заказ уже нельзя оплатить. Проверьте его статус в разделе «Мои генерации».',
  INVALID_PACKAGE_PRICE: 'Не удалось определить стоимость фотосессии.',
};

export default function CheckoutPanel({
  photoshootId,
  packageSlug,
  priceRub,
  priceCrystals,
}: CheckoutPanelProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_card');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState('');
  const wallet = useCrystalWallet();
  const balance = wallet.balance ?? 0;
  const hasEnoughCrystals = balance >= priceCrystals;

  async function startRubCheckout() {
    if (isRedirecting) return;
    setIsRedirecting(true);
    setError('');

    trackAnalyticsGoal('payment_checkout_started', { payment_method: paymentMethod });

    try {
      const response = await fetch('/api/payments/yookassa/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoshoot_id: photoshootId,
          payment_method: paymentMethod,
        }),
      });
      const payload = await response.json() as { confirmationUrl?: string; error?: string };
      if (!response.ok || !payload.confirmationUrl) {
        throw new Error(payload.error ?? 'PAYMENT_PROVIDER_FAILED');
      }

      const confirmationUrl = new URL(payload.confirmationUrl);
      if (confirmationUrl.protocol !== 'https:') throw new Error('INVALID_CONFIRMATION_URL');
      window.location.assign(confirmationUrl.toString());
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'PAYMENT_PROVIDER_FAILED';
      setError(ERROR_MESSAGES[code] ?? 'Не удалось открыть безопасную страницу оплаты. Попробуйте ещё раз.');
      setIsRedirecting(false);
    }
  }

  return (
    <div className={styles.paymentGrid}>
      <section className={styles.paymentCard} aria-labelledby="rub-payment-title">
        <div className={styles.cardHeader}>
          <span className={styles.iconBox}><CreditCard aria-hidden="true" /></span>
          <div>
            <h2 id="rub-payment-title">Оплатить в рублях</h2>
            <p>Безопасная оплата на странице ЮKassa</p>
          </div>
        </div>

        <div className={styles.price}>{priceRub} ₽</div>

        <fieldset className={styles.methodFieldset}>
          <legend>Способ оплаты</legend>
          <label className={paymentMethod === 'bank_card' ? styles.methodActive : styles.method}>
            <input
              type="radio"
              name="paymentMethod"
              value="bank_card"
              checked={paymentMethod === 'bank_card'}
              onChange={() => setPaymentMethod('bank_card')}
            />
            <CreditCard aria-hidden="true" />
            <span><strong>Банковская карта</strong><small>МИР, Visa или Mastercard</small></span>
          </label>
          <label className={paymentMethod === 'sbp' ? styles.methodActive : styles.method}>
            <input
              type="radio"
              name="paymentMethod"
              value="sbp"
              checked={paymentMethod === 'sbp'}
              onChange={() => setPaymentMethod('sbp')}
            />
            <Landmark aria-hidden="true" />
            <span><strong>СБП</strong><small>Через приложение вашего банка</small></span>
          </label>
        </fieldset>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button type="button" className={styles.primaryButton} onClick={startRubCheckout} disabled={isRedirecting}>
          {isRedirecting ? 'Переходим к оплате...' : `Оплатить ${priceRub} ₽`}
        </button>
      </section>

      <section className={styles.paymentCard} aria-labelledby="crystal-payment-title">
        <div className={styles.cardHeader}>
          <span className={styles.iconBox}><Diamond aria-hidden="true" /></span>
          <div>
            <h2 id="crystal-payment-title">Оплатить кристаллами</h2>
            <p>Используйте внутренний баланс PhotoGen</p>
          </div>
        </div>

        <div className={styles.price}>{priceCrystals} кристаллов</div>
        <div className={styles.balanceRow}>
          <span>Ваш баланс</span>
          <strong>{wallet.isLoading ? 'Загружаем...' : `${balance} кристаллов`}</strong>
        </div>

        {!wallet.isLoading && !hasEnoughCrystals ? (
          <div className={styles.insufficient} role="status">
            <p>Недостаточно кристаллов для этой фотосессии.</p>
            <Link href="/account/wallet">Пополнить баланс</Link>
          </div>
        ) : null}

        <form action={payWithCrystals} className={styles.crystalForm}>
          <input type="hidden" name="photoshootId" value={photoshootId} />
          <input type="hidden" name="packageSlug" value={packageSlug} />
          <SubmitPayButton disabled={wallet.isLoading || !hasEnoughCrystals} priceCrystals={priceCrystals} />
        </form>
      </section>
    </div>
  );
}