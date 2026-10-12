'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/login/login.module.css';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const checkSession = async () => {
      if (searchParams.get('error')) {
        if (active) {
          setError('Ссылка недействительна или устарела. Запросите новую ссылку.');
          setChecking(false);
        }
        return;
      }

      const { data, error: userError } = await supabase.auth.getUser();
      if (active) {
        setSessionValid(Boolean(data.user) && !userError);
        if (!data.user || userError) setError('Ссылка недействительна или устарела. Запросите новую ссылку.');
        setChecking(false);
      }
    };

    void checkSession();
    return () => { active = false; };
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Пароль должен содержать не менее 8 символов.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Не удалось изменить пароль. Запросите новую ссылку и попробуйте снова.');
      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: 'local' });
    setComplete(true);
    setLoading(false);
  };

  return (
    <main className={styles.main}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <Link href="/" className={`${styles.logo} gradient-text`}>PhotoGen</Link>
          <h1 className={styles.title}>Новый пароль</h1>
          <p className={styles.description}>Придумайте новый пароль для входа в PhotoGen.</p>
        </div>

        {checking ? <p className={styles.authStatus} role="status">Проверяем ссылку…</p> : null}

        {!checking && complete ? (
          <div className={styles.authStatus} role="status">
            <p>Пароль успешно изменён.</p>
            <Link href="/login" className={styles.btnSubmit}>Войти</Link>
          </div>
        ) : null}

        {!checking && !complete && sessionValid ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="new-password">Новый пароль</label>
              <input id="new-password" type="password" autoComplete="new-password" className={styles.input} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="confirm-new-password">Повторите пароль</label>
              <input id="confirm-new-password" type="password" autoComplete="new-password" className={styles.input} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
            </div>
            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            <button type="submit" className={styles.btnSubmit} disabled={loading}>{loading ? 'Сохраняем…' : 'Сохранить пароль'}</button>
          </form>
        ) : null}

        {!checking && !complete && !sessionValid ? (
          <div className={styles.authStatus} role="alert">
            <p>{error}</p>
            <Link href="/forgot-password" className={styles.btnSubmit}>Запросить новую ссылку</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className={styles.main}><p className={styles.authStatus}>Проверяем ссылку…</p></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}