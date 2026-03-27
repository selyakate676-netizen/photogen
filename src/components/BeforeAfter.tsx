import styles from './BeforeAfter.module.css';
import Reveal from './Reveal';
import ImageSlider from './ImageSlider';

export default function BeforeAfter() {
  return (
    <section className={`${styles.beforeAfter} section section-light`} id="examples">
      <div className="container">
        <Reveal>
          <h2 className="section-title">
            Это вы, только <span className="gradient-text">фотогеничнее</span>
          </h2>
          <p className="section-subtitle">
            100% ваше лицо. Потяните бегунок и убедитесь — 
            от обычного селфи до профессиональной съёмки один шаг
          </p>
        </Reveal>
      </div>

      {/* ONE massive slider spanning the page, containing multiple images inside it */}
      <Reveal delay={1}>
        <div className={styles.fullWidthSlider}>
          <ImageSlider 
            beforeImages={["/before-main.png", "/selfie-2.png", "/selfie-3.png"]} 
            afterImages={["/studio-glamour.png", "/studio-fashion.png", "/studio-nature.png"]} 
            beforeLabel="Обычные селфи" 
            afterLabel="Разные студийные образы (100% сходство)" 
          />
        </div>
      </Reveal>
    </section>
  );
}
