'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Gem, Settings } from 'lucide-react';
import { useCrystalWallet } from '@/lib/wallet/useCrystalWallet';
import PhotoGenLogo from './PhotoGenLogo';
import ThemeToggle from './ThemeToggle';
import styles from './Navbar.module.css';

const leftLinks = [
  { href: '/#how-it-works', label: 'Как это работает' },
  { href: '/#catalog', label: 'Каталог' },
  { href: '/studio', label: 'Студия' },
];

const guestLinks = [
  { href: '/login', label: 'Войти' },
  { href: '/signup', label: 'Регистрация' },
];

const userLinks = [
  { href: '/account/generated', label: 'Мои генерации' },
  { href: '/account/profile', label: 'Профиль' },
  { href: '/account/wallet', label: 'Кристаллы' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, balance, isLoading: isAuthLoading } = useCrystalWallet();

  const closeMenu = () => setIsMenuOpen(false);
  const accountLinks = user ? userLinks : guestLinks;
  const accountActions = (
    <>
      <ThemeToggle />
      <Link href="/settings" className={styles.iconButton} onClick={closeMenu} aria-label="Настройки" title="Настройки">
        <Settings aria-hidden="true" />
      </Link>
      {user ? (
        <Link href="/account/wallet" className={styles.balanceCta} onClick={closeMenu} aria-label="Баланс кристаллов">
          <Gem aria-hidden="true" />
          <strong>{balance ?? 0}</strong>
          <span>кристаллов</span>
        </Link>
      ) : null}
    </>
  );

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