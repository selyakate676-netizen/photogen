import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { mockPayment } from './actions';
import dashboardStyles from '../../dashboard.module.css';
import SubmitPayButton from './SubmitPayButton';
import AnalyticsEvent from '@/components/AnalyticsEvent';

export default async function MockPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Получаем данные о фотосессии
  const { data: photoshoot } = await supabase
    .from('photoshoots')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  // Если заказ не найден или не принадлежит пользователю
  if (!photoshoot) {
    return redirect('/account/generated');
  }

  // Если статус уже не pending (уже оплачено или ошибка)
  if (photoshoot.status !== 'pending') {
    return redirect('/account/generated');
  }

  return (
    <>
      <AnalyticsEvent
        goal="checkout_view"
        params={{
          package_slug: photoshoot.style_id,
          order_status: photoshoot.status,
          source_page: 'checkout',
          is_test_mode: true,
        }}
      />
      <Navbar />
      <main className={dashboardStyles.wrapper}>
        <div className={dashboardStyles.container}>
          <div className={dashboardStyles.header}>
             <Link href="/account/generated" style={{ color: 'var(--text-on-dark-secondary)', textDecoration: 'none' }}>
               ← Вернуться в мои генерации
             </Link>
          </div>
          
          <div className={dashboardStyles.emptyState}>
             <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
             <h2 className={dashboardStyles.emptyTitle}>Оплата заказа</h2>
             <p className={dashboardStyles.emptyDesc}>
               Это страница-заглушка. В будущем здесь будет редирект на безопасную страницу ЮKassa.
               <br/><br/>
               Заказ ID: <code style={{color: 'var(--text-on-dark-secondary)'}}>{photoshoot.id}</code><br/>
               Выбранный стиль: <strong style={{color: 'var(--text-on-dark)', textTransform: 'capitalize'}}>{photoshoot.style_id}</strong>
             </p>
             
             <div style={{ 
               background: 'rgba(255, 255, 255, 0.05)', 
               padding: '1.5rem', 
               borderRadius: '12px', 
               marginTop: '1rem',
               marginBottom: '1rem',
               border: '1px solid var(--border-dark)', 
               width: '100%', 
               maxWidth: '400px',
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.2rem', color: 'var(--text-on-dark-secondary)' }}>Итого:</span>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-primary)' }}>990 ₽</span>
             </div>

             <form action={mockPayment}>
                <input type="hidden" name="photoshootId" value={photoshoot.id} />
                <SubmitPayButton packageSlug={photoshoot.style_id} />
             </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
