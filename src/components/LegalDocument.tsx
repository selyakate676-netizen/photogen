import Footer from '@/components/Footer';
import styles from './LegalDocument.module.css';

type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export default function LegalDocument({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <main className={styles.page}>
        <article className={styles.document}>
          <p className={styles.kicker}>Документы PhotoGen</p>
          <h1>{title}</h1>
          <p className={styles.intro}>{intro}</p>

          {sections.map((section) => (
            <section key={section.title} className={styles.section}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items ? (
                <ul>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
            </section>
          ))}

          <aside className={styles.ownerNotice}>
            Реквизиты оператора и контактные данные будут опубликованы после подтверждения владельцем сервиса.
          </aside>
        </article>
      </main>
      <Footer />
    </>
  );
}
