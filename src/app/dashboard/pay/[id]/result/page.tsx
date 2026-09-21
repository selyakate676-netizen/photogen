import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createClient } from '@/utils/supabase/server';
import PaymentResult from './PaymentResult';
import styles from '../checkout.module.css';

export default async function PaymentResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={styles.container}>
          <PaymentResult paymentId={id} />
        </div>
      </main>
      <Footer />
    </>
  );
}