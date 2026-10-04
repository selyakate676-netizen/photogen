import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getPhotoPackForHistory } from '@/lib/photoPacks';
import { retryTraining } from '@/app/dashboard/actions';
import AnalyticsEvent from '@/components/AnalyticsEvent';
import { attributionAnalyticsParams, sanitizeAttributionSnapshot } from '@/lib/marketingAttribution';
import { resultImageUrls } from '@/lib/photoshoots/api';
import GeneratedPhotoshootsPoller from './GeneratedPhotoshootsPoller';
import { cancelUnstartedPhotoshoot } from './actions';
import styles from '../account.module.css';

const statusLabels: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  awaiting_payment: 'Ожидает подтверждения',
  paid: 'Оплата подтверждена',
  queued: 'В процессе',
  training: 'В процессе',
  generating: 'В процессе',
  completed: 'Готово',
  failed: 'Ошибка',
  cancelled: 'Отменено',
};

type GeneratedPageProps = {
  searchParams: Promise<{ payment_completed?: string; payment_failed?: string; package_slug?: string }>;
};

export default async function GeneratedPage({ searchParams }: GeneratedPageProps) {
  const query = await searchParams;
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
  const hasActivePhotoshoots = photoshoots.some(
    (shoot) => ['paid', 'queued', 'training', 'generating'].includes(shoot.status),
  );
  const pendingPhotoshoots = photoshoots.filter(
    (shoot) => shoot.status === 'awaiting_payment',
  );
  const actionableIds = new Set((await Promise.all(pendingPhotoshoots.map(async (shoot) => {
    const { data: canCancel } = await supabase.rpc('is_photoshoot_safe_to_cancel', {
      p_photoshoot_id: shoot.id,
    });
    return canCancel ? shoot.id : null;
  }))).filter((id): id is string => id !== null));
  const signedResultImages = new Map(await Promise.all(photoshoots.map(async (shoot) => [
    shoot.id,
    await resultImageUrls(
      shoot.id,
      Array.isArray(shoot.result_images)
        ? shoot.result_images.filter((image: unknown): image is string => typeof image === 'string')
        : [],
    ),
  ] as const)));
  const paymentShoot = photoshoots.find((shoot) => shoot.id === (query.payment_completed ?? query.payment_failed));
  const paymentAttribution = attributionAnalyticsParams(sanitizeAttributionSnapshot(paymentShoot?.attribution_snapshot));
  const paymentSnapshot = paymentShoot?.package_snapshot && typeof paymentShoot.package_snapshot === 'object' && !Array.isArray(paymentShoot.package_snapshot)
    ? paymentShoot.package_snapshot
    : null;
  const paymentAmount = paymentSnapshot && typeof paymentSnapshot.price_rub === 'number' ? paymentSnapshot.price_rub : undefined;

  return (
    <>
      <GeneratedPhotoshootsPoller active={hasActivePhotoshoots} />
      {query.payment_completed && paymentShoot && ['paid', 'queued', 'generating', 'completed'].includes(paymentShoot.status) ? (
        <AnalyticsEvent
          goal="payment_completed"
          dedupeKey={`payment-completed:${paymentShoot.id}`}
          params={{
            package_slug: paymentShoot.style_id,
            order_status: paymentShoot.status,
            payment_status: 'completed',
            amount: paymentAmount,
            currency: paymentAmount === undefined ? undefined : 'RUB',
            source_page: 'generated',
            is_test_mode: true,
            ...paymentAttribution,
          }}
        />
      ) : null}
      {query.payment_failed && paymentShoot ? (
        <AnalyticsEvent
          goal="payment_failed"
          dedupeKey={`payment-failed:${paymentShoot.id}`}
          params={{
            package_slug: paymentShoot.style_id,
            order_status: paymentShoot.status,
            payment_status: 'failed',
            amount: paymentAmount,
            currency: paymentAmount === undefined ? undefined : 'RUB',
            source_page: 'generated',
            is_test_mode: true,
            ...paymentAttribution,
          }}
        />
      ) : null}
      {photoshoots.filter((shoot) => shoot.status === 'completed' || shoot.status === 'failed').map((shoot) => (
        <AnalyticsEvent
          key={`lifecycle-analytics:${shoot.id}`}
          goal={shoot.status === 'completed' ? 'generation_completed' : 'generation_failed'}
          dedupeKey={`generation-${shoot.status}:${shoot.id}`}
          params={{
            package_slug: shoot.style_id,
            requested_images_count: shoot.requested_images_count ?? undefined,
            order_status: shoot.status,
            lifecycle_status: shoot.status,
            source_page: 'generated',
            ...attributionAnalyticsParams(sanitizeAttributionSnapshot(shoot.attribution_snapshot)),
          }}
        />
      ))}
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
            const pack = getPhotoPackForHistory(shoot.style_id);
            const resultImages = (signedResultImages.get(shoot.id) ?? []).slice(0, 4);
            const previewImages: string[] = resultImages.length > 0 ? resultImages : [pack?.image ?? '/after-main.png'];
            const isProcessing = ['paid', 'queued', 'training', 'generating'].includes(shoot.status);
            const requiresAction = actionableIds.has(shoot.id);

            return (
              <article key={shoot.id} className={styles.generationCard}>
                <div className={`${styles.generationPreview} ${previewImages.length === 1 ? styles.generationPreviewSingle : ''}`}>
                  <span className={`${styles.statusBadge} ${styles[`status_${shoot.status}`] ?? ''}`}>{requiresAction ? 'Требуется действие' : (statusLabels[shoot.status] ?? shoot.status)}</span>
                  {previewImages.map((image, index) => (
                    <div key={`${image}-${index}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" className={styles.previewImage} />
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
                    {requiresAction ? (
                      <>
                        <Link href={`/dashboard/pay/${shoot.id}`} className={styles.primaryButton}>Продолжить</Link>
                        <form action={cancelUnstartedPhotoshoot}>
                          <input type="hidden" name="photoshootId" value={shoot.id} />
                          <button type="submit" className={styles.secondaryButton}>Отменить</button>
                        </form>
                      </>
                    ) : null}
                    {shoot.status === 'completed' ? (
                      <Link href={`/dashboard/result/${shoot.id}`} className={styles.primaryButton}>Открыть</Link>
                    ) : null}
                    {shoot.status === 'failed' ? (
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
