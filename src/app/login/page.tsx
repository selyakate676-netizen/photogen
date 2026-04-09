'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import SocialAuth from '@/components/SocialAuth';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <Link href="/" className={`${styles.logo} gradient-text`}>PhotoGen</Link>
          <h1 className={styles.title}>Создайте личный кабинет</h1>
          <p className={styles.description}>
            Здесь будут безопасно храниться ваши исходники и готовые профессиональные фотографии в высоком разрешении.
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

        <form className={styles.form} onSubmit={handleLogin}>
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
              placeholder="••••••••"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button 
            type="submit" 
            className={styles.btnSubmit}
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти по Email'}
          </button>
        </form>

        <SocialAuth />

        <div className={styles.footer}>
          Нет аккаунта? 
          <Link href="/signup" className={styles.link}>Зарегистрироваться</Link>
        </div>

        <Link href="/" className={styles.backLink}>
          ← На главную
        </Link>
      </div>
    </main>
  );
}
