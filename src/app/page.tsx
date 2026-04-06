import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import BeforeAfter from '@/components/BeforeAfter';
import HowItWorks from '@/components/HowItWorks';
import StylesPreview from '@/components/StylesPreview';
import Reviews from '@/components/Reviews';
import Pricing from '@/components/Pricing';
import FAQ from '@/components/FAQ';
import FinalCTA from '@/components/FinalCTA';
import Footer from '@/components/Footer';
import Particles from '@/components/Particles';

export default function Home() {
  return (
    <>
      <Particles />
      <Navbar />
      <Hero />
      <BeforeAfter />
      <HowItWorks />
      <StylesPreview />
      <Pricing />
      <FAQ />
      <Reviews />
      <FinalCTA />
      <Footer />
    </>
  );
}
