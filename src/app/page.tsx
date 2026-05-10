import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { getTalents } from '@/lib/queries/talents';
import { getBrands, getCollaborators, getTeam } from '@/lib/queries/content';
import { getCaseStudies } from '@/lib/queries/cases';
import { getPortfolioItems } from '@/lib/queries/portfolio';

// Above-fold + Server Components: loaded eagerly
import { Hero } from '@/features/marketing-site/components/Hero';
import { Marquee } from '@/features/marketing-site/components/Marquee';
import { BrandsCarousel } from '@/features/marketing-site/components/BrandsCarousel';
import { TalentSection } from '@/features/marketing-site/components/TalentSection';
import { CollabsSection } from '@/features/marketing-site/components/CollabsSection';
import { CasesSection } from '@/features/marketing-site/components/CasesSection';
import { PortfolioSection } from '@/features/marketing-site/components/PortfolioSection';
import { AboutSection } from '@/features/marketing-site/components/AboutSection';
import { TeamGrid } from '@/features/marketing-site/components/TeamGrid';
import { Cs2LabCard } from '@/components/cs2-lab/Cs2LabCard';

// Client components below-fold: lazy-load JS, SSR preserved
const MetricsSection  = dynamic(() => import('@/features/marketing-site/components/MetricsSection').then(m => ({ default: m.MetricsSection })));
const ServicesSection = dynamic(() => import('@/features/marketing-site/components/ServicesSection').then(m => ({ default: m.ServicesSection })));
const CtaSection      = dynamic(() => import('@/features/marketing-site/components/CtaSection').then(m => ({ default: m.CtaSection })));
const FaqSection      = dynamic(() => import('@/features/marketing-site/components/FaqSection').then(m => ({ default: m.FaqSection })));
const ContactSection  = dynamic(() => import('@/features/contact/components/ContactSection').then(m => ({ default: m.ContactSection })));
const LiveSection     = dynamic(() => import('@/features/live/components/LiveSection').then(m => ({ default: m.LiveSection })));

async function CollabsSectionAsync() {
  const collaborators = await getCollaborators();
  return <CollabsSection collaborators={collaborators} />;
}

async function CasesSectionAsync() {
  const cases = await getCaseStudies();
  return <CasesSection cases={cases} />;
}

async function PortfolioSectionAsync() {
  const items = await getPortfolioItems();
  return <PortfolioSection items={items} />;
}

async function TeamGridAsync() {
  const team = await getTeam();
  return <TeamGrid team={team} />;
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
      <LiveSection />
      <MetricsSection />
      <Cs2LabCard variant="full" ctaId="home_cs2_lab_full" />
      <Suspense>
        <CollabsSectionAsync />
      </Suspense>
      <ServicesSection />
      <Suspense>
        <CasesSectionAsync />
      </Suspense>
      <Suspense>
        <PortfolioSectionAsync />
      </Suspense>
      <AboutSection />
      <Suspense>
        <TeamGridAsync />
      </Suspense>
      <CtaSection />
      <FaqSection />
      <ContactSection />
    </>
  );
}
