'use client';

import { useEffect, useState } from 'react';
import styles from '../account/account.module.css';

type Theme = 'dark' | 'light';

export default function SettingsControls() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    queueMicrotask(() => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
  }, []);

  const selectTheme = (nextTheme: Theme) => {
    // eslint-disable-next-line react-hooks/immutability -- synchronizes the global theme token.
    document.documentElement.dataset.theme = nextTheme;
    // eslint-disable-next-line react-hooks/immutability -- synchronizes the browser color scheme.
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem('photogen-theme', nextTheme);
    setTheme(nextTheme);
  };

  return (
    <div className={styles.settingsStack}>
      <section className={styles.panel}>
        <h2>Интерфейс</h2>
        <p className={styles.panelDescription}>Выберите оформление PhotoGen.</p>
        <div className={styles.choiceGrid} role="radiogroup" aria-label="Тема интерфейса">
          {(['light', 'dark'] as const).map((value) => (
            <button key={value} type="button" role="radio" aria-checked={theme === value} className={theme === value ? styles.choiceActive : styles.choice} onClick={() => selectTheme(value)}>
              <strong>{value === 'light' ? 'Светлая тема' : 'Тёмная тема'}</strong>
              <span>{value === 'light' ? 'Светлый нейтральный интерфейс' : 'Фирменный тёмный интерфейс'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Язык</h2>
        <p className={styles.panelDescription}>Язык интерфейса</p>
        <div className={styles.settingLine}><span>Русский</span><span className={styles.currentBadge}>Текущий</span></div>
      </section>
    </div>
  );
}
