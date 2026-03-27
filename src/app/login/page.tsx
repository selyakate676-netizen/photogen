import { login, signup } from './actions'
import styles from './login.module.css'
import Link from 'next/link'

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const searchParams = await props.searchParams;
  const error = searchParams?.error;
  const message = searchParams?.message;

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.logo}>
          <span className={styles.logoText}>PhotoGen</span>
        </div>
        <div className={styles.welcomeBox}>
          <h1 className={styles.welcomeTitle}>Создайте личный кабинет</h1>
          <p className={styles.welcomeDesc}>
            Здесь будут безопасно храниться ваши исходники и готовые профессиональные фотографии в высоком разрешении.
          </p>

          <div className={styles.bonusBadge}>
            <span className={styles.bonusIcon}>🛡️</span>
            <div className={styles.bonusText}>
              <strong>100% Гарантия качества</strong>
              Мы уверены в результате. Если вам не понравятся сгенерированные фотографии, мы вернем оплату в полном объеме.
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.error}>{error}</div>
        )}
        {message && (
          <div className={styles.success}>{message}</div>
        )}

        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">Пароль</label>
            <input
              className={styles.input}
              id="password"
              name="password"
              type="password"
              placeholder="Минимум 6 символов"
              required
              minLength={6}
            />
          </div>

          <button className={styles.buttonPrimary} formAction={login}>
            Войти по Email
          </button>

          <div className={styles.divider}>или войти через</div>

          <div className={styles.socialGrid}>
            <button type="button" className={styles.socialBtn}>
              <span className={styles.socialBrand}>✈️</span> Telegram
            </button>
            <button type="button" className={styles.socialBtn}>
              <span className={styles.socialBrand}>G</span> Google
            </button>
            <button type="button" className={styles.socialBtn}>
              <span className={styles.socialBrand}>VK</span> ВКонтакте
            </button>
            <button type="button" className={styles.socialBtn}>
              <span className={styles.socialBrand}>Я</span> Яндекс
            </button>
          </div>

          <p className={styles.registerPrompt}>
            Нет аккаунта? <button className={styles.textBtn} formAction={signup}>Зарегистрироваться</button>
          </p>
        </form>

        <Link href="/" className={styles.backLink}>
          ← На главную
        </Link>
      </div>
    </div>
  )
}
