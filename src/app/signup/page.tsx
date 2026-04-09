'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import SocialAuth from '@/components/SocialAuth';
import styles from '../login/login.module.css';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className={styles.main}>
        <div className={styles.loginCard}>
          <div className={styles.header}>
            <Link href="/" className={`${styles.logo} gradient-text`}>PhotoGen</Link>
            <h1 className={styles.title}>Проверьте почту</h1>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-on-dark-secondary)', lineHeight: '1.6' }}>
            Мы отправили вам ссылку для подтверждения регистрации на <strong>{email}</strong>. 
            Пожалуйста, перейдите по ней, чтобы активировать аккаунт.
          </p>
          <button 
            onClick={() => router.push('/login')} 
            className={styles.btnSubmit}
            style={{ marginTop: 'var(--space-xl)' }}
          >
            Вернуться ко входу
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <Link href="/" className={`${styles.logo} gradient-text`}>PhotoGen</Link>
          <h1 className={styles.title}>Создать аккаунт</h1>
          <p className={styles.description}>
            Регистрация позволит вам управлять своими нейрофотосессиями и скачивать результаты в любое время.
          </p>
        </div>

        <div className={styles.guarantee}>
          <div className={styles.shield}>🛡️</div>
          <div>
            <span className={styles.guaranteeTitle}>100% Гарантия качества</span>
            <p className={styles.guaranteeText}>
              Мы уверены в результате. Если вам не понравятся сгенерированные фотографии, мы вернем оплату в полном объеме.
            </p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSignup}>
          <div className={styles.group}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.group}>
            <label className={styles.label} htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              placeholder="Мин. 6 символов"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.group}>
            <label className={styles.label} htmlFor="confirmPassword">Повторите пароль</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button 
            type="submit" 
            className={styles.btnSubmit}
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <SocialAuth />

        <div className={styles.footer}>
          Уже есть аккаунт? 
          <Link href="/login" className={styles.link}>Войти</Link>
        </div>

        <Link href="/" className={styles.backLink}>
          ← На главную
        </Link>
      </div>
    </main>
  );
}
