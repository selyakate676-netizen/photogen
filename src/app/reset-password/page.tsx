'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateNewPassword } from '@/lib/auth/password-reset';
import styles from '../login/login.module.css';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const tokenHash = fragment.get('token_hash');
    const type = fragment.get('type');
    window.history.replaceState({}, '', '/reset-password');
    const request = tokenHash && type === 'recovery'
      ? fetch('/api/auth/password-reset/recovery-token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tokenHash, type }) })
      : fetch('/api/auth/password-reset/recovery-token', { cache: 'no-store' });
    void request.then(async (response) => {
      const result = await response.json() as { ready?: boolean };
      if (!response.ok || !result.ready) setError('Ссылка недействительна или устарела. Запросите новую ссылку восстановления.');
      else setRecoveryReady(true);
    }).catch(() => setError('Не удалось проверить ссылку. Проверьте соединение и попробуйте снова.')).finally(() => setCheckingRecovery(false));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || !recoveryReady) return;
    setError(null);
    const validationError = validateNewPassword(password, confirmation);
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/password-reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password, confirmation }) });
      const result = await response.json() as { updated?: boolean; error?: string; passwordUpdated?: boolean };
      if (!response.ok || !result.updated) {
        setRecoveryReady(false);
        setError(result.passwordUpdated ? 'Пароль изменён, но автоматически завершить сессию не удалось. Не продолжайте работу на этом устройстве и обратитесь в поддержку.' : 'Ссылка недействительна, устарела или уже использована. Запросите новую ссылку.');
        return;
      }
      router.replace('/login?password_reset=success'); router.refresh();
    } catch { setError('Не удалось обновить пароль. Проверьте соединение и попробуйте снова.'); }
    finally { setLoading(false); }
  };

  return <main className={styles.main}><div className={styles.loginCard}>
    <div className={styles.header}><Link href="/" className={`${styles.logo} gradient-text`}>Фотогенично</Link><h1 className={styles.title}>Новый пароль</h1><p className={styles.description}>Придумайте новый пароль длиной не менее 8 символов.</p></div>
    {checkingRecovery ? <p className={styles.helperText} role="status">Проверяем ссылку...</p> : recoveryReady ?
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.group}><label className={styles.label} htmlFor="password">Новый пароль</label><input id="password" type="password" autoComplete="new-password" minLength={8} className={styles.input} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        <div className={styles.group}><label className={styles.label} htmlFor="confirmation">Повторите пароль</label><input id="confirmation" type="password" autoComplete="new-password" minLength={8} className={styles.input} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
        {error && <div className={styles.error} role="alert">{error}</div>}<button type="submit" className={styles.btnSubmit} disabled={loading}>{loading ? 'Сохраняем...' : 'Сохранить новый пароль'}</button>
      </form> : <>{error && <div className={styles.error} role="alert">{error}</div>}<div className={styles.footer}><Link href="/forgot-password" className={styles.link}>Запросить новую ссылку</Link></div></>}
  </div></main>;
}
