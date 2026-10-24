'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PASSWORD_RESET_COOLDOWN_MS, passwordResetRedirectUrl } from '@/lib/auth/password-reset';
import { createClient } from '@/utils/supabase/client';
import styles from '../login/login.module.css';

const COOLDOWN_STORAGE_KEY = 'photogen-password-reset-requested-at';
const GENERIC_SUCCESS = 'Если аккаунт с таким email существует, мы отправили ссылку для восстановления пароля.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setMessage(null); setError(null);
    const lastRequest = Number(window.localStorage.getItem(COOLDOWN_STORAGE_KEY) ?? '0');
    if (Number.isFinite(lastRequest) && Date.now() - lastRequest < PASSWORD_RESET_COOLDOWN_MS) { setMessage(GENERIC_SUCCESS); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: passwordResetRedirectUrl(window.location.origin) });
      window.localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now()));
      setMessage(GENERIC_SUCCESS);
    } catch {
      setError('Не удалось связаться с сервисом. Проверьте соединение и попробуйте снова.');
    } finally { setLoading(false); }
  };

  return <main className={styles.main}><div className={styles.loginCard}>
    <div className={styles.header}><Link href="/" className={`${styles.logo} gradient-text`}>Фотогенично</Link><h1 className={styles.title}>Восстановление пароля</h1><p className={styles.description}>Укажите email, использованный при регистрации.</p></div>
    <form className={styles.form} onSubmit={handleSubmit}><div className={styles.group}><label className={styles.label} htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" className={styles.input} value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      {message && <div className={styles.success} role="status">{message}</div>}{error && <div className={styles.error} role="alert">{error}</div>}
      <button type="submit" className={styles.btnSubmit} disabled={loading}>{loading ? 'Отправляем...' : 'Получить ссылку'}</button></form>
    <div className={styles.footer}><Link href="/login" className={styles.link}>Вернуться ко входу</Link></div>
  </div></main>;
}
