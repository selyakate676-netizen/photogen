'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { TELEGRAM_PROVIDER } from '@/lib/auth/oauth-consent';
import { createClient } from '@/utils/supabase/client';
import styles from '../app/login/login.module.css';
import signupStyles from '../app/signup/signup.module.css';

export default function SocialAuth() {
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleTelegramLogin = async () => {
    if (!legalAccepted) {
      setError('Подтвердите согласие с документами перед входом через Telegram.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const consentResponse = await fetch('/api/auth/oauth-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true }),
      });
      if (!consentResponse.ok) throw new Error('Не удалось зафиксировать согласие');

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: TELEGRAM_PROVIDER,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) throw authError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ошибка входа через Telegram');
      setLoading(false);
    }
  };

  return (
    <div className={styles.socialContainer}>
      <div className={styles.divider}>или войти через</div>
      <label className={signupStyles.consent}>
        <input type="checkbox" checked={legalAccepted} onChange={(event) => setLegalAccepted(event.target.checked)} />
        <span>
          Я принимаю <Link href="/privacy" target="_blank">политику обработки персональных данных</Link> и даю{' '}
          <Link href="/personal-data-consent" target="_blank">согласие на обработку персональных данных</Link>.
        </span>
      </label>

      <div className={styles.socialGrid}>
        <button onClick={handleTelegramLogin} className={styles.socialBtn} type="button" disabled={loading}>
          <Send aria-hidden="true" size={18} />
          {loading ? 'Переходим...' : 'Telegram'}
        </button>
        <button className={styles.socialBtn} type="button" disabled aria-disabled="true">
          <span className={styles.socialBrand} aria-hidden="true">VK</span>
          VK ID — скоро
        </button>
      </div>
      {error && <div className={styles.error} role="alert">{error}</div>}
    </div>
  );
}
