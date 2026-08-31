import { LandingCtaBanner } from '@/components/landing/landing-cta-banner';
import { LandingDemoSection } from '@/components/landing/landing-demo-section';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingHowItWorks } from '@/components/landing/landing-how-it-works';
import { LandingScreenshots } from '@/components/landing/landing-screenshots';
import { LandingWhySection } from '@/components/landing/landing-why-section';
import { LandingTrustBar } from '@/components/landing/landing-trust-bar';
import { LandingVideoSection } from '@/components/landing/landing-video-section';

export default function HomePage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-canvas">
      <LandingHeader />
      <main className="w-full">
        <LandingHero />
        <LandingTrustBar />
        <LandingVideoSection />
        <LandingFeatures />
        <LandingScreenshots />
        <LandingHowItWorks />
        <LandingWhySection />
        <LandingDemoSection />
        <LandingCtaBanner />
      </main>
      <LandingFooter />
    </div>
  );
}
