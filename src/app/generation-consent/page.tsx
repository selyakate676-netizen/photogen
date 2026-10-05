import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = { title: 'Согласие на AI-генерацию — PhotoGen' };

export default function GenerationConsentPage() {
  return (
    <main className={styles.page}>
      <article className={styles.content}>
        <Link className={styles.back} href="/">← На главную</Link>
        <h1 className={styles.title}>Согласие на AI-генерацию</h1>
        <p className={styles.lead}>Запуская фотосессию, пользователь поручает PhotoGen создать изображения с помощью выбранного фотопака и AI-технологий.</p>

        <section className={styles.section}>
          <h2>Исходные фотографии</h2>
          <p>Пользователь подтверждает, что вправе загружать выбранные фотографии и использовать изображённых на них людей для этой генерации.</p>
        </section>

        <section className={styles.section}>
          <h2>Использование референсов</h2>
          <p>Фотографии Persona передаются AI-провайдеру как референсы внешности. PhotoGen не обещает точное или стопроцентное совпадение: результат может отличаться по чертам, композиции и деталям.</p>
        </section>

        <section className={styles.section}>
          <h2>Характер результата</h2>
          <p>Созданные изображения являются результатом автоматической генерации. Пользователь проверяет их пригодность для выбранной цели и соблюдение прав третьих лиц перед публикацией или иным использованием.</p>
        </section>
      </article>
    </main>
  );
}
