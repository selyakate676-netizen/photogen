import Link from 'next/link';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnalyticsEvent from '@/components/AnalyticsEvent';
import { createClient } from '@/utils/supabase/server';
import { isCloudPaymentsRubCheckoutAllowed } from '@/lib/payments/cloudpayments-gate';
import dashboardStyles from '../../dashboard.module.css';
import { mockPayment } from './actions';
import CloudPaymentsCheckout from './CloudPaymentsCheckout';
import CrystalPayButton from './CrystalPayButton';
import styles from './checkout.module.css';

type Snapshot = { price_rub?: unknown; price_crystals?: unknown };

function snapshotPrice(snapshot: unknown, key: keyof Snapshot): number | null {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
  const value = (snapshot as Snapshot)[key];
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: photoshoot } = await supabase
    .from('photoshoots')
    .select('id,user_id,style_id,status,package_snapshot,payment_id,payment_source')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!photoshoot) redirect('/account/generated');
  if (photoshoot.status !== 'pending' && photoshoot.status !== 'awaiting_payment') {
    redirect('/account/generated');
  }

  const crystalFlow = query.payment === 'crystals';
  const price = snapshotPrice(
    photoshoot.package_snapshot,
    crystalFlow ? 'price_crystals' : 'price_rub',
  );
  if (price === null) redirect('/account/generated');

  const rubCheckoutAllowed = crystalFlow || isCloudPaymentsRubCheckoutAllowed(user.id);

  let initialPaymentStatus: 'none' | 'pending' | 'succeeded' | 'failed' = 'none';
  if (!crystalFlow && rubCheckoutAllowed && photoshoot.payment_id) {
    const { data: payment } = await supabase
      .from('cloudpayments_payments')
      .select('status')
      .eq('id', photoshoot.payment_id)
      .eq('user_id', user.id)
      .maybeSingle();
    initialPaymentStatus = payment?.status ?? 'none';
  }

  return (
    <>
      {rubCheckoutAllowed ? (
        <AnalyticsEvent
        goal="payment_started"
        dedupeKey={`payment-started:${photoshoot.id}:${crystalFlow ? 'crystals' : 'rub'}`}
        params={{
          package_slug: photoshoot.style_id,
          order_status: photoshoot.status,
          source_page: 'checkout',
          amount: price,
          currency: crystalFlow ? 'CRYSTALS' : 'RUB',
        }}
        />
      ) : null}
      <Navbar />
      <main className={dashboardStyles.wrapper}>
        <div className={dashboardStyles.container}>
          <div className={dashboardStyles.header}>
            <Link href="/account/generated" style={{ color: 'var(--text-on-dark-secondary)', textDecoration: 'none' }}>
              ← Вернуться в мои генерации
            </Link>
          </div>
          <div className={dashboardStyles.emptyState}>
            <section className={styles.checkoutCard}>
              <div aria-hidden="true" style={{ fontSize: '3rem' }}>💳</div>
              <h1 className={dashboardStyles.emptyTitle}>Оплата фотосессии</h1>
              <p className={styles.orderMeta}>
                Заказ: {photoshoot.id}<br />
                Фотопак: <strong>{photoshoot.style_id}</strong>
              </p>
              <div className={styles.priceRow}>
                <span>Итого</span>
                <span className={styles.price}>{price} {crystalFlow ? 'кристаллов' : '₽'}</span>
              </div>
              {crystalFlow ? (
                <form action={mockPayment}>
                  <input type="hidden" name="photoshootId" value={photoshoot.id} />
                  <CrystalPayButton />
                </form>
              ) : rubCheckoutAllowed ? (
                <CloudPaymentsCheckout
                  photoshootId={photoshoot.id}
                  initialPaymentStatus={initialPaymentStatus}
                />
              ) : (
                <>
                  <p className={styles.statusMessage} role="status">
                    Оплата банковской картой сейчас доступна только в закрытом тесте.
                  </p>
                  <Link href="/account/generated" className="btn btn-secondary btn-lg">
                    Вернуться в мои генерации
                  </Link>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
