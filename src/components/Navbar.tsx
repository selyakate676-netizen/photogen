'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import PhotoGenLogo from './PhotoGenLogo';
import ThemeToggle from './ThemeToggle';
import styles from './Navbar.module.css';

const leftLinks = [
  { href: '/#how-it-works', label: 'Как это работает' },
  { href: '/#catalog', label: 'Каталог' },
  { href: '/dashboard/new', label: 'Студия' },
];

const guestLinks = [
  { href: '/login', label: 'Войти' },
  { href: '/signup', label: 'Регистрация' },
];

const userLinks = [
  { href: '/account/generated', label: 'Мои генерации' },
  { href: '/dashboard', label: 'Профиль' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (isMounted) {
        setUser(data.user);
        setIsAuthLoading(false);
      }
    };
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const closeMenu = () => setIsMenuOpen(false);
  const accountLinks = user ? userLinks : guestLinks;
  const accountActions = user ? (
    <>
      <ThemeToggle />
      <Link href="/settings" className={styles.iconButton} onClick={closeMenu} aria-label="Настройки" title="Настройки">
        <Settings aria-hidden="true" />
      </Link>
    </>
  ) : <ThemeToggle />;

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navInner}`}>
        <div className={styles.leftZone}>
          <Link href="/" className={styles.logo} onClick={closeMenu}>
            <PhotoGenLogo className={styles.logoMark} />
          </Link>
          <div className={styles.leftNav}>
            {leftLinks.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu}>{link.label}</Link>)}
          </div>
        </div>

        <button type="button" className={`${styles.burger} ${isMenuOpen ? styles.burgerActive : ''}`} onClick={() => setIsMenuOpen((current) => !current)} aria-label="Открыть меню" aria-expanded={isMenuOpen}>
          <span /><span /><span />
        </button>

        <div className={`${styles.mobilePanel} ${isMenuOpen ? styles.mobilePanelOpen : ''}`}>
          <div className={styles.mobileNavGroup}>
            {leftLinks.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu}>{link.label}</Link>)}
          </div>
          {!isAuthLoading ? (
            <div className={styles.mobileNavGroup}>
              {accountLinks.map((link) => <Link key={link.label} href={link.href} onClick={closeMenu}>{link.label}</Link>)}
            </div>
          ) : null}
          {!isAuthLoading ? <div className={styles.mobileActionRow}>{accountActions}</div> : null}
        </div>

        {!isAuthLoading ? (
          <div className={styles.rightZone}>
            <div className={styles.userRow}>
              {accountLinks.map((link) => <Link key={link.label} href={link.href} onClick={closeMenu}>{link.label}</Link>)}
            </div>
            {accountActions}
          </div>
        ) : null}
      </div>
    </nav>
  );
}