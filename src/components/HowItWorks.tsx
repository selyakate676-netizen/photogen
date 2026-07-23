import Link from 'next/link';
import styles from './HowItWorks.module.css';

const text = {
  heading: '\u041a\u0430\u043a \u044d\u0442\u043e \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442',
  subtitle: '\u0414\u043e \u2192 \u0432\u044b\u0431\u0440\u0430\u043d\u043e \u2192 \u043f\u043e\u0441\u043b\u0435: \u0442\u0440\u0438 \u0448\u0430\u0433\u0430 \u0434\u043e \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0439 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u0438',
  cta: '\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u044e',
  selected: '\u0412\u044b\u0431\u0440\u0430\u043d\u043e',
  selectedPhotos: '\u0412\u044b\u0431\u0440\u0430\u043d\u043e 3 \u0444\u043e\u0442\u043e',
  ready: '\u0413\u043e\u0442\u043e\u0432\u043e',
};

const steps = {
  one: {
    step: '\u0428\u0410\u0413 1',
    kicker: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u0448\u0438 \u043b\u0443\u0447\u0448\u0438\u0435 \u0444\u043e\u0442\u043e',
  },
  two: {
    step: '\u0428\u0410\u0413 2',
    kicker: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043e\u0442\u043e\u0441\u0435\u0441\u0441\u0438\u044e',
  },
  three: {
    step: '\u0428\u0410\u0413 3',
    kicker: '\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u0435 \u0433\u043e\u0442\u043e\u0432\u044b\u0435 AI-\u0444\u043e\u0442\u043e',
  },
};

const sourcePhotos = ['/selfie-2.png', '/selfie-3.png', '/before-main.png'];
const packagePhotos = ['/studio-glamour.png', '/studio-fashion.png', '/studio-nature.png'];
const resultPhotos = ['/studio-glamour.png', '/studio-fashion.png', '/studio-nature.png', '/studio-red-light-v2.png'];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 12.5 4 4L18.5 8" />
    </svg>
  );
}

function StepLabel({ step, kicker }: { step: string; kicker: string }) {
  return (
    <div className={styles.stepCopy}>
      <div className={styles.stepKicker}>{step}</div>
      <h3>{kicker}</h3>
    </div>
  );
}

function SourceVisual() {
  return (
    <div className={`${styles.visualPanel} ${styles.sourcePanel}`} aria-hidden="true">
      <div className={styles.panelTopline}>
        <span>PhotoGen</span>
        <strong>{text.selectedPhotos}</strong>
      </div>
      <div className={styles.sourceGrid}>
        {sourcePhotos.map((src, index) => (
          <div className={styles.sourcePhoto} key={src}>
            <img src={src} alt="" />
            <div className={styles.photoCheck}><CheckIcon /></div>
            <span>{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageVisual() {
  return (
    <div className={`${styles.visualPanel} ${styles.packagePanel}`} aria-hidden="true">
      <div className={styles.packageHero}>
        <img src="/studio-glamour.png" alt="" />
        <div className={styles.packageBadge}>{text.selected}</div>
      </div>
      <div className={styles.packageInfo}>
        <div>
          <span>Modern Muse</span>
          <strong>Studio editorial</strong>
        </div>
        <div className={styles.selectedPill}>{text.selected}</div>
      </div>
      <div className={styles.packageStrip}>
        {packagePhotos.map((src) => (
          <img src={src} alt="" key={src} />
        ))}
      </div>
    </div>
  );
}

function ResultVisual() {
  return (
    <div className={`${styles.visualPanel} ${styles.resultPanel}`} aria-hidden="true">
      <div className={styles.resultMosaic}>
        <div className={styles.resultMain}>
          <img src={resultPhotos[0]} alt="" />
          <div className={styles.readyBadge}>{text.ready}</div>
        </div>
        <div className={styles.resultStack}>
          {resultPhotos.slice(1).map((src) => (
            <img src={src} alt="" key={src} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className={`${styles.howItWorks} section section-dark-alt`} id="how-it-works">
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>{text.heading}</h2>
          <p className={styles.subtitle}>{text.subtitle}</p>
        </div>

        <div className={styles.story}>
          <article className={`${styles.step} ${styles.stepOne}`}>
            <StepLabel {...steps.one} />
            <SourceVisual />
          </article>

          <article className={`${styles.step} ${styles.stepTwo}`}>
            <PackageVisual />
            <StepLabel {...steps.two} />
          </article>

          <article className={`${styles.step} ${styles.stepThree}`}>
            <StepLabel {...steps.three} />
            <ResultVisual />
          </article>
        </div>

        <div className={styles.footerAction}>
          <Link href="/#styles" className={`btn btn-primary ${styles.cta}`}>
            {text.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}