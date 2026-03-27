import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navInner}`}>
        <a href="#hero" className={styles.logo}>
          <span className="gradient-text">PhotoGen</span>
        </a>

        <div className={styles.navLinks}>
          <a href="#examples">Примеры</a>
          <a href="#how-it-works">Как это работает</a>
          <a href="#styles">Направления</a>
          <a href="#pricing">Цены</a>
        </div>

        <a href="#pricing" className={`btn btn-primary ${styles.navCta}`}>
          Начать
        </a>
      </div>
    </nav>
  );
}
