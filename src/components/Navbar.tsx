'use client';

import { useState } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navInner}`}>
        <a href="#hero" className={styles.logo} onClick={closeMenu}>
          <span className="gradient-text">PhotoGen</span>
        </a>

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
          <a href="#examples" onClick={closeMenu}>Примеры</a>
          <a href="#how-it-works" onClick={closeMenu}>Как это работает</a>
          <a href="#styles" onClick={closeMenu}>Направления</a>
          <a href="#pricing" onClick={closeMenu}>Цены</a>
          
          {/* Кнопка "Начать" внутри мобильного меню */}
          <a 
            href="#pricing" 
            className={`btn btn-primary ${styles.mobileCta}`}
            onClick={closeMenu}
          >
            Начать
          </a>
        </div>

        {/* Кнопка "Начать" для десктопа */}
        <a href="#pricing" className={`btn btn-primary ${styles.navCta}`}>
          Начать
        </a>
      </div>
    </nav>
  );
}
