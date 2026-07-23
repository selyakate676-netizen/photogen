import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import CatalogSection from '@/components/CatalogSection';
import FAQ from '@/components/FAQ';
import Reviews from '@/components/Reviews';
import Footer from '@/components/Footer';
import Particles from '@/components/Particles';

export default function Home() {
  return (
    <>
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