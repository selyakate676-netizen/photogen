import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import styles from './dashboard.module.css';
import TrainingProgress from './TrainingProgress';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Получаем список фотосессий из БД, отсортированный от новых к старым
  const { data: photoshootsData, error } = await supabase
    .from('photoshoots')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const photoshoots = photoshootsData || [];

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
              {photoshoots.map((shoot) => (
                <div key={shoot.id} className={styles.shootCard}>
                  <div className={styles.shootHeader}>
                    <span className={styles.shootDate}>
                      {new Date(shoot.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`${styles.shootStatus} ${styles[`status_${shoot.status}`] || styles.status_pending}`}>
                      {shoot.status === 'completed' ? 'Готово' : shoot.status === 'error' ? 'Ошибка' : 'В процессе'}
                    </span>
                  </div>
                  <div className={styles.shootBody}>
                    <p className={styles.shootStyle}>Стиль: <strong>{shoot.style_id}</strong></p>
                    <p className={styles.shootImagesCount}>Загружено фото: {shoot.images?.length || 0}</p>
                    
                    {/* Прогресс-бар для активных процессов */}
                    {(shoot.status === 'training' || shoot.status === 'generating' || shoot.status === 'pending') && (
                        <TrainingProgress 
                            photoshootId={shoot.id} 
                            initialStatus={shoot.status} 
                        />
                    )}
                  </div>
                  <div className={styles.shootFooter}>
                    {shoot.status === 'completed' ? (
                      <Link href={`/dashboard/result/${shoot.id}`} className={`btn btn-primary btn-sm ${styles.actionBtn}`} style={{ display: 'inline-block', textAlign: 'center' }}>Результат</Link>
                    ) : shoot.status === 'pending' ? (
                      <Link href={`/dashboard/pay/${shoot.id}`} className={`btn btn-primary btn-sm ${styles.actionBtn}`} style={{ display: 'inline-block', textAlign: 'center' }}>Оплатить</Link>
                    ) : (
                      <button className={`btn btn-secondary btn-sm ${styles.actionBtn}`} disabled>В процессе</button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Карточка для новой генерации */}
              <div className={styles.shootCard} style={{ borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Link href="/dashboard/new" className="btn btn-primary btn-sm" style={{ width: '100%', textAlign: 'center' }}>
                  + Новая фотосессия
                </Link>
              </div>
            </div>
          )}

          <div style={{ marginTop: 'var(--space-4xl)' }}>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <h3>Всего генераций</h3>
                <p className={styles.statValue}>{photoshoots.length}</p>
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
