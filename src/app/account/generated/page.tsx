import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getPhotoPack } from '@/lib/photoPacks';
import { retryTraining } from '@/app/dashboard/actions';
import styles from '../account.module.css';

const statusLabels: Record<string, string> = {
  pending: 'Генерируется',
  training: 'Генерируется',
  generating: 'Генерируется',
  completed: 'Готово',
  error: 'Ошибка',
};

export default async function GeneratedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data } = await supabase
    .from('photoshoots')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const photoshoots = data ?? [];
  const s3Endpoint = process.env.S3_ENDPOINT ?? 'https://s3.ru1.storage.beget.cloud';
  const bucket = process.env.S3_BUCKET_NAME;
  const getImageUrl = (key: string) => {
    if (key.startsWith('http') || key.startsWith('/')) return key;
    if (!bucket) return key;
    return `${s3Endpoint}/${bucket}/${key}`;
  };

  return (
    <>
      <header className={`${styles.sectionHeader} ${styles.generatedPageHeader}`}>
        <div>
          <h2>Мои генерации</h2>
          <p>Готовые фотосессии и запуски, которые находятся в процессе.</p>
        </div>
      </header>


      {photoshoots.length === 0 ? (
        <section className={styles.emptyState}>
          <div className={styles.emptyInner}>
            <h2>Здесь появятся ваши фотосессии</h2>
            <p>Выберите стиль в каталоге и запустите первую генерацию.</p>
            <Link href="/#catalog" className={styles.primaryButton}>Перейти в каталог</Link>
          </div>
        </section>
      ) : (
        <div className={styles.generationGrid}>
          {photoshoots.map((shoot) => {
            const pack = getPhotoPack(shoot.style_id);
            const resultImages = Array.isArray(shoot.result_images)
              ? shoot.result_images.filter((image: unknown): image is string => typeof image === 'string').slice(0, 4)
              : [];
            const previewImages: string[] = resultImages.length > 0 ? resultImages : [pack?.image ?? '/after-main.png'];
            const isProcessing = shoot.status === 'training' || shoot.status === 'generating';

            return (
              <article key={shoot.id} className={styles.generationCard}>
                <div className={`${styles.generationPreview} ${previewImages.length === 1 ? styles.generationPreviewSingle : ''}`}>
                  <span className={`${styles.statusBadge} ${styles[`status_${shoot.status}`] ?? ''}`}>{statusLabels[shoot.status] ?? 'В процессе'}</span>
                  {previewImages.map((image, index) => (
                    <div key={`${image}-${index}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getImageUrl(image)} alt="" className={styles.previewImage} />
                    </div>
                  ))}
                </div>
                <div className={styles.generationBody}>
                  <h3>{pack?.title ?? shoot.style_id}</h3>
                  <div className={styles.generationMeta}>
                    <span>{resultImages.length || pack?.photos || 0} фото</span>
                    <span>{new Date(shoot.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  {isProcessing ? (
                    <>
                      <p className={styles.panelDescription}>Создаём фотосессию</p>
                      <div className={styles.progressTrack} aria-hidden="true" />
                    </>
                  ) : null}
                  <div className={styles.generationActions}>
                    {shoot.status === 'completed' ? (
                      <Link href={`/dashboard/result/${shoot.id}`} className={styles.primaryButton}>Открыть</Link>
                    ) : null}
                    {shoot.status === 'error' ? (
                      <form action={retryTraining}>
                        <input type="hidden" name="photoshootId" value={shoot.id} />
                        <button type="submit" className={styles.secondaryButton}>Повторить</button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
