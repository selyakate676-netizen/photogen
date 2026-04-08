import { ImageUp, SlidersHorizontal, Sparkles } from 'lucide-react';
import styles from './HowItWorks.module.css';
import Reveal from './Reveal';

const steps = [
  {
    number: 1,
    title: 'ЗАГРУЗИТЕ СВОИ ФОТО',
    desc: 'Загрузите 10–20 своих фото, чтобы нейросеть обучилась работать с вашим лицом и фигурой.',
    icon: <ImageUp size={32} />
  },
  {
    number: 2,
    title: 'ВЫБЕРИТЕ ФОТОСЕССИЮ',
    desc: 'Выберите любой готовый пакет фотосессии — от делового стиля до креативного арта.',
    icon: <SlidersHorizontal size={32} />
  },
  {
    number: 3,
    title: 'ПОЛУЧИТЕ ГОТОВЫЕ ИИ ФОТО',
    desc: 'В результате вы получите несколько нейрофото с вами в разных позах, готовых к публикации!',
    icon: <Sparkles size={32} />
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
            Три простых шага — и ваши идеальные фотографии готовы
          </p>
        </Reveal>

        <div className={styles.grid}>
          {/* Step 1: Text Top, Image Bottom */}
          <div className={styles.stepColumn}>
            <Reveal delay={0.1}>
              <div className={styles.textPart}>
                <div className={styles.stepNumber}>Шаг 1</div>
                <h3 className={styles.stepTitle}>{steps[0].title}</h3>
                <p className={styles.stepDesc}>{steps[0].desc}</p>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className={`${styles.phonePart} ${styles.phoneTop}`}>
                <div className={styles.phoneMockup}>
                  <div className={styles.phoneScreen}>
                     <div className={styles.phoneHeader}>
                        <div className={styles.phoneTitle}>Галерея</div>
                     </div>
                     <div className={styles.phoneGalleryGrid}>
                        <div className={styles.galleryItem}><img src="/before-main.png" alt="Selfie 1" /></div>
                        <div className={styles.galleryItem}><img src="/ashley-1.png" alt="Selfie 2" /></div>
                        <div className={styles.galleryItem}><img src="/ashley-2.png" alt="Selfie 3" /></div>
                        <div className={styles.galleryItem}><img src="/ashley-3.png" alt="Selfie 4" /></div>
                        <div className={styles.galleryItem}><img src="/ashley-4.png" alt="Selfie 5" /></div>
                        <div className={styles.galleryItem}><img src="/before-1.png" alt="Selfie 6" /></div>
                     </div>
                     <div className={styles.phoneSelectionTag}>Выбрано 15/15</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Step 2: Image Top, Text Bottom */}
          <div className={styles.stepColumn}>
            <Reveal delay={0.3}>
              <div className={`${styles.phonePart} ${styles.phoneBottom}`}>
                <div className={styles.phoneMockup}>
                  <div className={styles.phoneScreen}>
                     <div className={styles.phoneHeader}>
                        <div className={styles.phoneTitle}>Выбор стиля</div>
                     </div>
                     <div className={styles.phoneStylePreview}>
                        <img src="/after-1.png" alt="Preview" className={styles.blurredPreview} />
                        <div className={styles.previewOverlay} >
                           <div className={styles.phoneStylesLabelSmall}>Популярные направления:</div>
                           <div className={styles.phoneMiniStyles}>
                              <div className={styles.miniStyleCard}><img src="/studio-fashion.png" alt="S1" /></div>
                              <div className={styles.miniStyleCard}><img src="/studio-nature.png" alt="S2" /></div>
                              <div className={styles.miniStyleCard}><img src="/studio-bw-man.png" alt="S3" /></div>
                           </div>
                        </div>
                     </div>
                     <div className={styles.phoneStyleLabel}>Стиль: Modern Muse</div>
                     <div className={styles.phoneStylesPreview}>
                        <div className={styles.styleCard}><img src="/studio-fashion.png" alt="Fashion" /></div>
                        <div className={styles.styleCard} style={{borderColor: 'var(--accent-primary)'}}><img src="/studio-glamour.png" alt="Glamour" /></div>
                        <div className={styles.styleCard}><img src="/studio-nature.png" alt="Nature" /></div>
                     </div>
                     <div className={styles.phoneActionButton}>Начать фотосессию</div>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.4}>
              <div className={styles.textPart}>
                <div className={styles.stepNumber}>Шаг 2</div>
                <h3 className={styles.stepTitle}>{steps[1].title}</h3>
                <p className={styles.stepDesc}>{steps[1].desc}</p>
              </div>
            </Reveal>
          </div>

          {/* Step 3: Text Top, Image Bottom */}
          <div className={styles.stepColumn}>
            <Reveal delay={0.5}>
              <div className={styles.textPart}>
                <div className={styles.stepNumber}>Шаг 3</div>
                <h3 className={styles.stepTitle}>{steps[2].title}</h3>
                <p className={styles.stepDesc}>{steps[2].desc}</p>
              </div>
            </Reveal>
            <Reveal delay={0.6}>
              <div className={`${styles.phonePart} ${styles.phoneTop}`}>
                <div className={styles.phoneMockup}>
                  <div className={styles.phoneScreen}>
                     <div className={styles.phoneResultHeader}>
                        <span>Результат</span>
                        <div className={styles.heartIcon}>❤️</div>
                     </div>
                     <div className={styles.phoneResultImage}>
                        <img src="/after-main.png" alt="Result" />
                        <div className={styles.successBadge}>Идеально!</div>
                     </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.8}>
          <div className={styles.footerAction}>
            <a href="#pricing" className="btn btn-primary btn-lg">
              Создать свою фотосессию
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

