'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '../app/login/Login.module.css';

export default function SocialAuth() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const supabase = createClient();

  const handleSocialLogin = async (provider: any) => {
    setLoadingProvider(provider);
    try {
      // Автоматическое определение URL для редиректа
      const getURL = () => {
        let url =
          process?.env?.NEXT_PUBLIC_SITE_URL ?? // Установите это в Vercel/Beget
          process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Автоматически от Vercel
          window.location.origin;
        // Убедимся, что протокол включен и убираем лишний слэш в конце
        url = url.includes('http') ? url : `https://${url}`;
        return url;
      };

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getURL()}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in with social provider:', error);
      alert('Ошибка при входе через ' + provider);
      setLoadingProvider(null);
    }
  };

  return (
    <div className={styles.socialContainer}>
      <div className={styles.divider}>или войти через</div>
      <div className={styles.socialGrid}>
        <button 
          onClick={() => handleSocialLogin('telegram')} 
          className={styles.socialBtn}
          type="button"
          disabled={!!loadingProvider}
        >
          <span className={styles.socialBrand}>✈️</span> 
          {loadingProvider === 'telegram' ? '...' : 'Telegram'}
        </button>
        <button 
          onClick={() => handleSocialLogin('google')} 
          className={styles.socialBtn}
          type="button"
          disabled={!!loadingProvider}
        >
          <span className={styles.socialBrand}>G</span> 
          {loadingProvider === 'google' ? '...' : 'Google'}
        </button>
        <button 
          onClick={() => handleSocialLogin('vk')} 
          className={styles.socialBtn}
          type="button"
          disabled={!!loadingProvider}
        >
          <span className={styles.socialBrand}>VK</span> 
          {loadingProvider === 'vk' ? '...' : 'ВКонтакте'}
        </button>
        <button 
          onClick={() => handleSocialLogin('yandex')} 
          className={styles.socialBtn}
          type="button"
          disabled={!!loadingProvider}
        >
          <span className={styles.socialBrand}>Я</span> 
          {loadingProvider === 'yandex' ? '...' : 'Яндекс'}
        </button>
      </div>
    </div>
  );
}
