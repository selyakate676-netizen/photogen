'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/login/login.module.css';

const GENERIC_CONFIRMATION = 'Если аккаунт с таким email существует, мы отправили ссылку для восстановления пароля.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    setLoading(false);
    if (resetError) {
      setError('Не удалось отправить письмо. Попробуйте ещё раз немного позже.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <main className={styles.main}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <Link href="/" className={`${styles.logo} gradient-text`}>PhotoGen</Link>
          <h1 className={styles.title}>Восстановление пароля</h1>
          <p className={styles.description}>Укажите email, который использовали при регистрации.</p>
        </div>

        {submitted ? (
          <div className={styles.authStatus} role="status">
            <p>{GENERIC_CONFIRMATION}</p>
            <p>Проверьте папку «Спам», если письмо не появилось в течение нескольких минут.</p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="recovery-email">Email</label>
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                className={styles.input}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? 'Отправляем…' : 'Получить ссылку'}
            </button>
          </form>
        )}

        <Link href="/login" className={styles.backLink}>← Вернуться ко входу</Link>
      </div>
    </main>
  );
}