import dynamic from 'next/dynamic';
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

// Client components below-fold: lazy-load JS, SSR preserved
const MetricsSection  = dynamic(() => import('@/features/marketing-site/components/MetricsSection').then(m => ({ default: m.MetricsSection })));
const ServicesSection = dynamic(() => import('@/features/marketing-site/components/ServicesSection').then(m => ({ default: m.ServicesSection })));
const CtaSection      = dynamic(() => import('@/features/marketing-site/components/CtaSection').then(m => ({ default: m.CtaSection })));
const FaqSection      = dynamic(() => import('@/features/marketing-site/components/FaqSection').then(m => ({ default: m.FaqSection })));
const ContactSection  = dynamic(() => import('@/features/contact/components/ContactSection').then(m => ({ default: m.ContactSection })));

// Revalidate every hour (ISR)
export const revalidate = 3600;

export default async function HomePage() {
  const [talents, brands, collaborators, team, cases, portfolioItems] =
    await Promise.all([
      getTalents(),
      getBrands(),
      getCollaborators(),
      getTeam(),
      getCaseStudies(),
      getPortfolioItems(),
    ]);

  return (
    <>
      <Hero />
      <Marquee />
      <BrandsCarousel brands={brands} />
      <TalentSection talents={talents} />
      <MetricsSection />
      <CollabsSection collaborators={collaborators} />
      <ServicesSection />
      <CasesSection cases={cases} />
      <PortfolioSection items={portfolioItems} />
      <AboutSection />
      <TeamGrid team={team} />
      <CtaSection />
      <FaqSection />
      <ContactSection />
    </>
  );
}
