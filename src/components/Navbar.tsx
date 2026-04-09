'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    closeMenu();
  };

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navInner}`}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          <span className="gradient-text">PhotoGen</span>
        </Link>

        {/* Бургер-меню для мобилок */}
        <button 
          className={`${styles.burger} ${isMenuOpen ? styles.burgerActive : ''}`}
          onClick={toggleMenu}
          aria-label="Открыть меню"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ''}`}>
          <a href="/#examples" onClick={closeMenu}>Примеры</a>
          <a href="/#how-it-works" onClick={closeMenu}>Как это работает</a>
          <a href="/#styles" onClick={closeMenu}>Направления</a>
          <a href="/#pricing" onClick={closeMenu}>Цены</a>
          
          {user ? (
            <>
              <Link href="/dashboard" className={styles.mobileCta} onClick={closeMenu}>
                Кабинет
              </Link>
              <button onClick={handleSignOut} className={styles.signOutBtnMobile}>
                Выйти
              </button>
            </>
          ) : (
            <Link href="/login" className={`btn btn-primary ${styles.mobileCta}`} onClick={closeMenu}>
              Войти
            </Link>
          )}
        </div>

        <div className={styles.desktopActions}>
          {user ? (
            <div className={styles.userActions}>
              <Link href="/dashboard" className={`btn btn-secondary ${styles.navCta}`}>
                Кабинет
              </Link>
              <button onClick={handleSignOut} className={styles.signOutBtn}>
                Выйти
              </button>
            </div>
          ) : (
            <Link href="/login" className={`btn btn-primary ${styles.navCta}`}>
              Войти
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
