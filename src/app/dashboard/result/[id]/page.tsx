import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import dashboardStyles from '../../dashboard.module.css';

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (!photoshoot || photoshoot.status !== 'completed') {
    return redirect('/dashboard');
  }

  // Конфиг домена S3 для отображения изображений
  const s3Endpoint = process.env.S3_ENDPOINT || 'https://s3.ru1.storage.beget.cloud';
  const bucket = process.env.S3_BUCKET_NAME || 'b22788230a30-photogen';
  
  // Функция для превращения S3 ключа в публичный URL URL
  const getImageUrl = (key: string) => {
    if (key.startsWith('http')) return key; // Если это прямой Replicate фолбэк URL
    return `${s3Endpoint}/${bucket}/${key}`;
  };

  return (
    <>
      <Navbar />
      <main className={dashboardStyles.wrapper} style={{ paddingBottom: 'var(--space-4xl)'}}>
        <div className={dashboardStyles.container}>
          <div className={dashboardStyles.header}>
             <Link href="/dashboard" style={{ color: 'var(--text-on-dark-secondary)', textDecoration: 'none' }}>
               ← Вернуться в дашборд
             </Link>
             <h1 style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-2xl)' }}>
               Твои результаты ✨
             </h1>
          </div>
          
          <div style={{ marginTop: 'var(--space-xl)' }}>
             <p style={{ color: 'var(--text-on-dark-secondary)', marginBottom: 'var(--space-xl)' }}>
                Стиль: <strong style={{color: 'var(--text-on-dark)', textTransform: 'capitalize'}}>{photoshoot.style_id}</strong>
             </p>

            <div style={{
               display: 'grid',
               gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
               gap: 'var(--space-lg)'
            }}>
               {photoshoot.result_images && photoshoot.result_images.map((key: string, index: number) => (
                  <div key={index} style={{
                     borderRadius: 'var(--radius-lg)',
                     overflow: 'hidden',
                     border: '1px solid var(--border-dark)',
                     position: 'relative',
                     aspectRatio: '3/4'
                  }}>
                     <img 
                        src={getImageUrl(key)} 
                        alt={`Result ${index + 1}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                     />
                     <div style={{
                         position: 'absolute',
                         bottom: 0,
                         left: 0,
                         right: 0,
                         padding: '1rem',
                         background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                         display: 'flex',
                         justifyContent: 'center'
                     }}>
                        <a 
                          href={getImageUrl(key)} 
                          download={`ai-portrait-${index + 1}.jpg`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          ⬇ Скачать HD
                        </a>
                     </div>
                  </div>
               ))}
               
               {(!photoshoot.result_images || photoshoot.result_images.length === 0) && (
                   <div className={dashboardStyles.emptyState} style={{ gridColumn: '1 / -1' }}>
                       <p>Изображения не найдены или произошла ошибка.</p>
                   </div>
               )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
