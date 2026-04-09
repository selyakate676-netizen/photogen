import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import styles from './Dashboard.module.css';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // В будущем здесь будет запрос к БД для получения списка фотосессий
  const photoshoots: any[] = [];

  return (
    <>
      <Navbar />
      <main className={styles.wrapper}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.welcome}>
              <h1>Привет! 👋</h1>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
            <div className={styles.balance}>
              <span className={styles.balanceLabel}>Твой баланс</span>
              <span className={styles.balanceValue}>0 фото</span>
            </div>
          </header>

          {photoshoots.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📸</div>
              <h2 className={styles.emptyTitle}>У вас пока нет фотосессий</h2>
              <p className={styles.emptyDesc}>
                Загрузите свои фотографии, выберите стиль, и наша нейросеть создаст 
                для вас потрясающие профессиональные портреты за несколько минут.
              </p>
              <Link href="/dashboard/new" className="btn btn-primary btn-lg">
                Создать первую фотосессию
              </Link>
            </div>
          ) : (
            <div className={styles.photoshootsGrid}>
              {/* Здесь будет список существующих фотосессий */}
            </div>
          )}

          <div style={{ marginTop: 'var(--space-4xl)' }}>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <h3>Всего генераций</h3>
                <p className={styles.statValue}>0</p>
              </div>
              <div className={styles.statCard}>
                <h3>Активных заказов</h3>
                <p className={styles.statValue}>0</p>
              </div>
              <div className={styles.statCard}>
                <h3>Тариф</h3>
                <p className={styles.statValue} style={{ fontSize: 'var(--font-size-xl)' }}>Не выбран</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
