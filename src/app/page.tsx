import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import CatalogSection from '@/components/CatalogSection';
import FAQ from '@/components/FAQ';
import Reviews from '@/components/Reviews';
import Footer from '@/components/Footer';
import Particles from '@/components/Particles';
import AnalyticsEvent from '@/components/AnalyticsEvent';

type HomeProps = {
  searchParams: Promise<{ section?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const showHowItWorks = query.section === 'how-it-works';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !showHowItWorks) redirect('/catalog');

  return (
    <>
      <AnalyticsEvent goal="landing_view" params={{ source_page: 'landing' }} />
      <Particles />
      <Hero />
      <HowItWorks ctaState={user ? 'ready' : 'guest'} />
      <CatalogSection />
      <FAQ />
      <Reviews />
      <Footer />
    </>
  );
}