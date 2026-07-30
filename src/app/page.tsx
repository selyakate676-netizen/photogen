import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import CatalogSection from '@/components/CatalogSection';
import FAQ from '@/components/FAQ';
import Reviews from '@/components/Reviews';
import Footer from '@/components/Footer';
import Particles from '@/components/Particles';
import AnalyticsEvent from '@/components/AnalyticsEvent';

export default function Home() {
  return (
    <>
      <AnalyticsEvent goal="landing_view" params={{ source_page: 'landing' }} />
      <Particles />
      <Hero />
      <HowItWorks />
      <CatalogSection />
      <FAQ />
      <Reviews />
      <Footer />
    </>
  );
}