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
              Профессиональные фотографии с помощью искусственного интеллекта. 
              Без фотографа, без камеры — только вы и AI.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4>Сервис</h4>
              <ul>
                <li><a href="#how-it-works">Как это работает</a></li>
                <li><a href="#styles">Направления</a></li>
                <li><a href="#pricing">Цены</a></li>
              </ul>
            </div>
            <div className={styles.footerCol}>
              <h4>Поддержка</h4>
              <ul>
                <li><a href="#">FAQ</a></li>
                <li><a href="#">Telegram</a></li>
                <li><a href="#">Email</a></li>
              </ul>
            </div>
            <div className={styles.footerCol}>
              <h4>Документы</h4>
              <ul>
                <li><a href="#">Политика конфиденциальности</a></li>
                <li><a href="#">Оферта</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © 2026 PhotoGen. Все права защищены.
          </p>
          <p className={styles.footerNote}>
            Сделано с ✨ и искусственным интеллектом
          </p>
        </div>
      </div>
    </footer>
  );
}
