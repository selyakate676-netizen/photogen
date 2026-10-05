import styles from './Footer.module.css';
import Link from 'next/link';

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
              Профессиональные фотографии с помощью искусственного интеллекта.
              Без фотографа, без камеры — только вы и AI.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4>Сервис</h4>
              <ul>
                <li><Link href="/#how-it-works">Как это работает</Link></li>
                <li><Link href="/catalog">Каталог</Link></li>
              </ul>
            </div>
            <div className={styles.footerCol}>
              <h4>Поддержка</h4>
              <ul>
                <li><Link href="/#faq">FAQ</Link></li>
              </ul>
            </div>
            <div className={styles.footerCol}>
              <h4>Документы</h4>
              <ul>
                <li><Link href="/privacy">Политика конфиденциальности</Link></li>
                <li><Link href="/offer">Оферта</Link></li>
                <li><Link href="/personal-data-consent">Согласие на обработку данных</Link></li>
                <li><Link href="/generation-consent">Согласие на AI-генерацию</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>© 2026 PhotoGen.</p>
          <p className={styles.footerNote}>
            Сервис создания изображений с помощью искусственного интеллекта
          </p>
        </div>
      </div>
    </footer>
  );
}
