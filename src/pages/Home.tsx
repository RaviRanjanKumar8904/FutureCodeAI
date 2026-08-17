import BackgroundBlobs from '../components/BackgroundBlobs';
import SEO from '../components/SEO';
import HeroSection from '../components/home/HeroSection';
import TrustBar from '../components/home/TrustBar';
import OfferingsSection from '../components/home/OfferingsSection';
import FeaturedCourses from '../components/home/FeaturedCourses';
import TimelineSection from '../components/home/TimelineSection';
import StatsSection from '../components/home/StatsSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import EnquirySection from '../components/home/EnquirySection';
import CTABanner from '../components/home/CTABanner';

export default function Home() {
  return (
    <div className="w-full relative bg-background">
      <SEO 
        title="Welcome to FutureCodeAI" 
        description="FutureCodeAI - Empowering students with cutting-edge technology courses in Full Stack, Data Science, AI, and Web3."
        keywords="EdTech, Coding, AI, Web Development, FutureCodeAI, Tech Education"
      />
      <BackgroundBlobs />
      
      <main className="w-full">
        <HeroSection />
        <TrustBar />
        <OfferingsSection />
        <FeaturedCourses />
        <TimelineSection />
        <StatsSection />
        <TestimonialsSection />
        <EnquirySection />
        <CTABanner />
      </main>
    </div>
  );
}
