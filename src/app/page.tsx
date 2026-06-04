import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { getTalents } from '@/lib/queries/talents';
import { getBrands } from '@/lib/queries/content';
import { getCaseStudies } from '@/lib/queries/cases';

// Above-fold + Server Components: loaded eagerly
import { Hero } from '@/features/marketing-site/components/Hero';
import { Marquee } from '@/features/marketing-site/components/Marquee';
import { BrandsCarousel } from '@/features/marketing-site/components/BrandsCarousel';
import { TalentSection } from '@/features/marketing-site/components/TalentSection';
import { WorkedWithSection } from '@/features/marketing-site/components/WorkedWithSection';
import { CasesSection } from '@/features/marketing-site/components/CasesSection';
import { LiveSection } from '@/features/live/components/LiveSection';

const SHOW_LIVE_SECTION = false;

// Client components below-fold: lazy-load JS, SSR preserved
const ServicesSection = dynamic(() => import('@/features/marketing-site/components/ServicesSection').then(m => ({ default: m.ServicesSection })));
const CtaSection      = dynamic(() => import('@/features/marketing-site/components/CtaSection').then(m => ({ default: m.CtaSection })));
// FaqSection is now a Server Component — regular import, no client JS bundle
import { FaqSection } from '@/features/marketing-site/components/FaqSection';
const ContactSection  = dynamic(() => import('@/features/contact/components/ContactSection').then(m => ({ default: m.ContactSection })));

async function CasesSectionAsync() {
  const cases = await getCaseStudies();
  return <CasesSection cases={cases} />;
}

export const metadata: Metadata = {
  title: 'SocialPro — Agencia Gaming & iGaming | España y LatAm',
  description:
    'Agencia de talentos gaming e iGaming fundada en 2012. Streamers verificados de CS2, Valorant e iGaming en España y LatAm. FTD tracking, compliance DGOJ y ROI medible desde el panel del operador.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'SocialPro — Agencia Gaming & iGaming | España y LatAm',
    description:
      '+13 años conectando creadores gaming con marcas. CS2, Valorant, iGaming. +340 FTDs verificados. España + 6 mercados LATAM.',
    url: SITE_URL,
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'SocialPro — Agencia de Performance Marketing Gaming y Esports',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SocialPro — Agencia Gaming & iGaming | España y LatAm',
    description:
      '+13 años conectando creadores gaming con marcas. CS2, Valorant, iGaming. +340 FTDs verificados.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

// Revalidate every hour (ISR)
export const revalidate = 3600;


// FAQPage JSON-LD is emitted by FaqSection (Server Component) — no duplicate here.

export default async function HomePage() {
  const [talents, brands] = await Promise.all([
    getTalents(),
    getBrands(),
  ]);

  return (
    <>
      <Hero />
      <Marquee />
      <BrandsCarousel brands={brands} />
      <TalentSection talents={talents} />
      <WorkedWithSection />
      {SHOW_LIVE_SECTION && (
        <Suspense fallback={
          <section className="bg-sp-black py-16 px-4 sm:px-6 border-t border-white/[0.06]">
            <div className="max-w-5xl mx-auto h-48 rounded-xl bg-white/[0.02] animate-pulse" />
          </section>
        }>
          <LiveSection />
        </Suspense>
      )}
      <ServicesSection />
      <Suspense>
        <CasesSectionAsync />
      </Suspense>
      <CtaSection />
      <FaqSection />
      <ContactSection />
    </>
  );
}
