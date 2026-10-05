import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = { title: 'Согласие на обработку персональных данных — PhotoGen' };

export default function PersonalDataConsentPage() {
  return (
    <main className={styles.page}>
      <article className={styles.content}>
        <Link className={styles.back} href="/">← На главную</Link>
        <h1 className={styles.title}>Согласие на обработку персональных данных</h1>
        <p className={styles.lead}>Создавая аккаунт и используя PhotoGen, пользователь подтверждает согласие на обработку данных, необходимых для работы выбранных функций сервиса.</p>

        <section className={styles.section}>
          <h2>Состав данных</h2>
          <p>К таким данным относятся сведения аккаунта, профиль Persona, загруженные фотографии, данные анкеты внешности, сведения о заказах и созданные изображения.</p>
        </section>

        <section className={styles.section}>
          <h2>Цели обработки</h2>
          <p>Данные обрабатываются для авторизации, создания и повторного использования Persona, формирования AI-фотосессий, хранения результатов, поддержки пользователя и обеспечения безопасности сервиса.</p>
        </section>

        <section className={styles.section}>
          <h2>Действия с данными</h2>
          <p>Сервис может получать, записывать, хранить, использовать, передавать необходимым инфраструктурным и AI-провайдерам и удалять данные в пределах функций PhotoGen.</p>
        </section>

        <section className={styles.section}>
          <h2>Управление данными</h2>
          <p>Доступную для удаления Persona пользователь может удалить в профиле. Связанные с ней записи фотографий и приватные исходные файлы удаляются существующим flow сервиса.</p>
        </section>
      </article>
    </main>
  );
}
