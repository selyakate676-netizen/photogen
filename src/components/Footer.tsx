import Link from 'next/link';

import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={`${styles.footer} section-light-alt`}>
      <div className="container">
        <div className={styles.footerInner}>
          <div className={styles.brand}>
            <div className={styles.brandName}>
              <span className="gradient-text">PhotoGen</span>
            </div>
            <p className={styles.brandDesc}>
              Профессиональные AI-фотосессии на основе ваших фотографий.
            </p>
          </div>

          <nav className={styles.footerLinks} aria-label="Навигация в подвале">
            <div className={styles.footerCol}>
              <h4>Сервис</h4>
              <ul>
                <li><Link href="/#how-it-works">Как это работает</Link></li>
                <li><Link href="/#catalog">Каталог</Link></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4>Документы</h4>
              <ul>
                <li><Link href="/privacy">Политика обработки данных</Link></li>
                <li><Link href="/offer">Публичная оферта</Link></li>
                <li><Link href="/personal-data-consent">Согласие на обработку ПД</Link></li>
                <li><Link href="/generation-consent">Согласие на генерацию изображений</Link></li>
              </ul>
            </div>

            <div className={styles.footerCol} id="contacts">
              <h4>Контакты</h4>
              <ul>
                <li><Link href="/#faq">Частые вопросы</Link></li>
                <li className={styles.placeholder}>[TODO владельца: email поддержки]</li>
              </ul>
            </div>
          </nav>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>© 2026 PhotoGen. Все права защищены.</p>
          <p className={styles.footerNote}>AI-фотосессии для личных и профессиональных задач</p>
        </div>
      </div>
    </footer>
  );
}
