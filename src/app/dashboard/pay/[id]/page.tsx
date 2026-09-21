import Link from 'next/link';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createClient } from '@/utils/supabase/server';
import CheckoutPanel from './CheckoutPanel';
import styles from './checkout.module.css';

type Snapshot = Record<string, unknown>;

function readSnapshot(value: unknown): Snapshot {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Snapshot : {};
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: photoshoot } = await supabase
    .from('photoshoots')
    .select('id,user_id,status,style_id,package_snapshot')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!photoshoot) redirect('/account/generated');
  if (!['pending', 'awaiting_payment'].includes(photoshoot.status)) {
    redirect('/account/generated');
  }

  const snapshot = readSnapshot(photoshoot.package_snapshot);
  const priceRub = positiveInteger(snapshot.price_rub);
  const priceCrystals = positiveInteger(snapshot.price_crystals);
  const packageName = typeof snapshot.name === 'string' ? snapshot.name : photoshoot.style_id;

  if (!priceRub || !priceCrystals) redirect('/account/generated');

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={styles.container}>
          <Link href="/account/generated" className={styles.backLink}>
            ← Вернуться в мои генерации
          </Link>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>Оплата фотосессии</p>
            <h1>{packageName}</h1>
            <p>Выберите удобный способ оплаты. После подтверждения заказ появится в ваших генерациях.</p>
          </div>
          <CheckoutPanel
            photoshootId={photoshoot.id}
            packageSlug={photoshoot.style_id}
            priceRub={priceRub}
            priceCrystals={priceCrystals}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
