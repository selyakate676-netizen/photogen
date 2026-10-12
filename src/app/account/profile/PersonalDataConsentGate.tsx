import Link from 'next/link';
import { acceptPersonalDataConsent } from './consent-actions';
import styles from './PersonalDataConsentGate.module.css';

export default function PersonalDataConsentGate() {
  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <h1>Подтвердите согласие</h1>
        <p>Для создания или изменения Persona необходимо актуальное согласие на обработку персональных данных.</p>
        <form action={acceptPersonalDataConsent}>
          <label className={styles.consentRow}>
            <input type="checkbox" name="accepted" required />
            <span>
              Я даю согласие на обработку персональных данных. Ознакомиться с{' '}
              <Link href="/personal-data-consent">согласием</Link>,{' '}
              <Link href="/privacy">политикой конфиденциальности</Link> и{' '}
              <Link href="/offer">офертой</Link>.
            </span>
          </label>
          <button className="btn btn-primary" type="submit">Подтвердить</button>
        </form>
        <Link href="/account/generated" className={styles.resultsLink}>Мои готовые фотосессии</Link>
      </section>
    </main>
  );
}
