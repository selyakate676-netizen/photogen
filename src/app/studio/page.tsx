import Link from 'next/link';
import { ImageUp, TextCursorInput } from 'lucide-react';
import styles from './studio.module.css';

const modes = [
  {
    icon: TextCursorInput,
    title: 'По описанию',
    description: 'Создание уникального изображения по вашему собственному текстовому описанию.',
  },
  {
    icon: ImageUp,
    title: 'По фотографии',
    description: 'Создание нового изображения на основе загруженной фотографии.',
  },
];

export default function StudioPage() {
  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <span>Отдельный творческий режим</span>
        <h1>Студия</h1>
        <p>Создавайте уникальные изображения по собственному описанию или на основе загруженной фотографии.</p>
      </section>

      <div className={styles.modes}>
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <article className={styles.mode} key={mode.title}>
              <div className={styles.modeIcon}><Icon aria-hidden="true" /></div>
              <div><h2>{mode.title}</h2><p>{mode.description}</p></div>
              <span>Скоро</span>
            </article>
          );
        })}
      </div>

      <section className={styles.catalogCta}>
        <div>
          <h2>Нужна готовая профессиональная фотосессия?</h2>
          <p>Фотопаки с продуманными образами и сценами находятся в каталоге.</p>
        </div>
        <Link href="/catalog" className="btn btn-primary">Перейти в каталог</Link>
      </section>
    </main>
  );
}
