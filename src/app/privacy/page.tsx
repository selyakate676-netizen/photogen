import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = { title: 'Политика конфиденциальности — PhotoGen' };

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.content}>
        <Link className={styles.back} href="/">← На главную</Link>
        <h1 className={styles.title}>Политика конфиденциальности</h1>
        <p className={styles.lead}>На этой странице описано, какие данные использует PhotoGen для работы сервиса.</p>

        <section className={styles.section}>
          <h2>Какие данные обрабатываются</h2>
          <ul>
            <li>данные аккаунта и профиль Persona;</li>
            <li>загруженные исходные фотографии и сведения о внешности;</li>
            <li>выбранные фотопаки, заказы, статусы генерации и готовые результаты;</li>
            <li>технические данные, first-party attribution, включая UTM-метки и yclid;</li>
            <li>аналитические данные — только в соответствии с выбором пользователя в cookie-баннере.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Для чего нужны данные</h2>
          <p>Данные используются для создания аккаунта и Persona, выполнения выбранной AI-фотосессии, сохранения результатов в личном кабинете, обеспечения безопасности и анализа работы сервиса.</p>
        </section>

        <section className={styles.section}>
          <h2>Фотографии и внешние сервисы</h2>
          <p>Исходные фотографии хранятся в закрытом объектном хранилище и могут повторно использоваться как референсы только в фотосессиях того же пользователя. Для выполнения генерации необходимые данные передаются инфраструктурным и AI-провайдерам, участвующим в оказании сервиса.</p>
        </section>

        <section className={styles.section}>
          <h2>Удаление Persona</h2>
          <p>Доступную для удаления Persona можно удалить через профиль. Текущий flow удаляет запись Persona, связанные записи фотографий и соответствующие приватные исходные файлы. Основная Persona, необходимая для работы профиля, не удаляется без создания другой основной Persona.</p>
        </section>

        <section className={styles.section}>
          <h2>Cookies и аналитика</h2>
          <p>PhotoGen использует необходимые cookies для авторизации и работы сервиса. Яндекс Метрика загружается после согласия пользователя на аналитические cookies.</p>
        </section>
      </article>
    </main>
  );
}
