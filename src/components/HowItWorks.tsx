import { ImageUp, SlidersHorizontal, Sparkles } from 'lucide-react';
import styles from './HowItWorks.module.css';
import Reveal from './Reveal';

const steps = [
  {
    number: 1,
    icon: <ImageUp size={36} strokeWidth={1.5} />,
    title: 'Загрузите фото',
    desc: 'Загрузите 10–20 обычных фотографий с телефона. AI научится узнавать именно вас.',
  },
  {
    number: 2,
    icon: <SlidersHorizontal size={36} strokeWidth={1.5} />,
    title: 'Выберите стиль',
    desc: 'Деловой портрет, фото для соцсетей, сайта знакомств или аватарки — выберите то, что нужно.',
  },
  {
    number: 3,
    icon: <Sparkles size={36} strokeWidth={1.5} />,
    title: 'Получите результат',
    desc: 'Через 15 минут — реалистичные фото, которые не отличить от работы профессионального фотографа.',
  },
];

export default function HowItWorks() {
  return (
    <section className={`${styles.howItWorks} section section-dark-alt`} id="how-it-works">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            Как это <span className="gradient-text">работает</span>
          </h2>
          <p className="section-subtitle">
            Три простых шага — и ваши фото готовы
          </p>
        </Reveal>

        <div className={styles.layout}>
          {/* Left Column (Step 1 & 2) */}
          <div className={styles.columnDesc}>
            <Reveal delay={1} className={styles.revealWrapper}>
              <div className={`${styles.step} glass-card`}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>01</div>
                  <div className={styles.stepIcon}>{steps[0].icon}</div>
                </div>
                <h3 className={styles.stepTitle}>{steps[0].title}</h3>
                <p className={styles.stepDesc}>{steps[0].desc}</p>
              </div>
            </Reveal>

            <Reveal delay={2} className={styles.revealWrapper}>
              <div className={`${styles.step} glass-card`}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>02</div>
                  <div className={styles.stepIcon}>{steps[1].icon}</div>
                </div>
                <h3 className={styles.stepTitle}>{steps[1].title}</h3>
                <p className={styles.stepDesc}>{steps[1].desc}</p>
              </div>
            </Reveal>
          </div>

          {/* Center Column (Phone) */}
          <div className={styles.columnCenter}>
            <Reveal delay={3} className={styles.mockupReveal}>
              <div className={styles.phoneMockup}>
                <div className={styles.phoneScreen}>
                   {/* UI Overlays to match user reference */}
                  <div className={styles.phoneHeader}>
                    <div className={styles.phoneTitle}>Create Your AI Avatar</div>
                  </div>
                  
                  <div className={styles.phoneBody}>
                    <div className={styles.phoneStepLabel}>Step 1: Select Your Selfie</div>
                    <div className={styles.phonePhotoContainer}>
                      <img 
                        src="/mobile-mockup.png" 
                        alt="Мобильный интерфейс приложения" 
                        className={styles.phoneImage} 
                      />
                      <div className={styles.phonePhotoGlow} />
                      <div className={styles.phonePhotoLabel}>Selected Photo</div>
                    </div>
                    <div className={styles.phoneStatus}>Selection Complete</div>
                    
                    <div className={styles.phoneFooter}>
                       <div className={styles.phoneRecentsLabel}>Recents</div>
                       <div className={styles.phoneRecentsGrid}>
                          <div className={styles.phoneRecentItem} />
                          <div className={styles.phoneRecentItem} />
                          <div className={styles.phoneRecentItem} />
                          <div className={styles.phoneRecentItem} />
                       </div>
                       <div className={styles.phoneButtons}>
                          <div className={styles.phoneBtnSecondary}>Retake Photo</div>
                          <div className={styles.phoneBtnPrimary}>Proceed to Analyze ✨</div>
                       </div>
                    </div>
                  </div>
                </div>
                <div className={styles.phoneGlow} />
              </div>
            </Reveal>
          </div>

          {/* Right Column (Step 3) */}
          <div className={styles.columnDesc}>
            <Reveal delay={4} className={styles.revealWrapper}>
              <div className={`${styles.step} glass-card`} style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>03</div>
                  <div className={styles.stepIcon}>{steps[2].icon}</div>
                </div>
                <h3 className={styles.stepTitle}>{steps[2].title}</h3>
                <p className={styles.stepDesc}>{steps[2].desc}</p>
              </div>
            </Reveal>
            <div className={styles.spacer}></div>
          </div>
        </div>
      </div>
    </section>
  );
}
