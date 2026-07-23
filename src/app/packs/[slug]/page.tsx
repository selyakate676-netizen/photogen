import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import PhotoPackDetails from '@/components/PhotoPackDetails';
import { getPhotoPack, getRelatedPhotoPacks, photoPacks } from '@/lib/photoPacks';
import styles from './PhotoPackPage.module.css';

type PackPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return photoPacks.map((pack) => ({ slug: pack.slug }));
}

export async function generateMetadata({ params }: PackPageProps) {
  const { slug } = await params;
  const pack = getPhotoPack(slug);

  if (!pack) {
    return { title: 'Фотосессия не найдена | PhotoGen' };
  }

  return {
    title: `${pack.title} | PhotoGen`,
    description: pack.summary,
  };
}

export default async function PhotoPackPage({ params }: PackPageProps) {
  const { slug } = await params;
  const pack = getPhotoPack(slug);

  if (!pack) {
    notFound();
  }

  const relatedPacks = getRelatedPhotoPacks(pack.slug, 6);

  return (
    <>
      <main className={styles.page}>
        <PhotoPackDetails pack={pack} relatedPacks={relatedPacks} />
      </main>
      <Footer />
    </>
  );
}