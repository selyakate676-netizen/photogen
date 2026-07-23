'use client';

import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

type Theme = 'dark' | 'light';

const storageKey = 'photogen-theme';

function getCurrentTheme(): Theme {
  if (typeof document === 'undefined') {
    return 'dark';
  }

  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    queueMicrotask(() => setTheme(getCurrentTheme()));
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    // eslint-disable-next-line react-hooks/immutability -- synchronizes the global theme token.
    document.documentElement.dataset.theme = nextTheme;
    // eslint-disable-next-line react-hooks/immutability -- synchronizes the browser color scheme.
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem(storageKey, nextTheme);
    setTheme(nextTheme);
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20.5 14.2A7.4 7.4 0 0 1 9.8 3.5 8.6 8.6 0 1 0 20.5 14.2Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4.4" />
          <path d="M12 2.4v2.2M12 19.4v2.2M4.6 12H2.4M21.6 12h-2.2M6.8 6.8 5.2 5.2M18.8 18.8l-1.6-1.6M17.2 6.8l1.6-1.6M5.2 18.8l1.6-1.6" />
        </svg>
      )}
    </button>
  );
}