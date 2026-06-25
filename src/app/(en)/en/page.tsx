import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { getTalents } from '@/lib/queries/talents';
import { getBrands } from '@/lib/queries/content';
import { getCaseStudies } from '@/lib/queries/cases';

import { Hero } from '@/features/marketing-site/components/Hero';
import { Marquee } from '@/features/marketing-site/components/Marquee';
import { BrandsCarousel } from '@/features/marketing-site/components/BrandsCarousel';
import { TalentSection } from '@/features/marketing-site/components/TalentSection';
import { CasesSection } from '@/features/marketing-site/components/CasesSection';
import { FaqSection } from '@/features/marketing-site/components/FaqSection';

const ServicesSection = dynamic(() =>
  import('@/features/marketing-site/components/ServicesSection').then((m) => ({ default: m.ServicesSection })),
);
const CtaSection = dynamic(() =>
  import('@/features/marketing-site/components/CtaSection').then((m) => ({ default: m.CtaSection })),
);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Gaming & Esports Influencer Marketing Agency — Spain & LatAm',
  description:
    'SocialPro connects creators with brands. 13+ years in gaming, esports and iGaming influencer marketing. Verified streamers in Spain and LatAm. Performance-tracked campaigns.',
  alternates: {
    canonical: absoluteUrl('/en'),
    languages: {
      en: absoluteUrl('/en'),
      es: SITE_URL,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    title: 'Gaming & Esports Influencer Marketing Agency | SocialPro',
    description:
      'Verified gaming creators in Spain and LatAm. Performance-tracked campaigns for iGaming, esports and consumer brands.',
    url: absoluteUrl('/en'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/og-socialpro.png'),
        width: 1200,
        height: 630,
        alt: 'Gaming & Esports Influencer Marketing Agency — SocialPro',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaming & Esports Influencer Marketing Agency | SocialPro',
    description: 'Verified gaming creators in Spain and LatAm. Performance-tracked influencer campaigns.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

async function CasesSectionAsync() {
  const cases = await getCaseStudies();
  return <CasesSection cases={cases} />;
}

export default async function HomeEnPage() {
  const [talents, brands] = await Promise.all([getTalents(), getBrands()]);

  return (
    <>
      <Hero />
      <Marquee />
      <BrandsCarousel brands={brands} />
      <TalentSection talents={talents} />
      <div className="border-t border-sp-border">
        <ServicesSection />
      </div>
      <Suspense>
        <CasesSectionAsync />
      </Suspense>
      <CtaSection />
      <FaqSection />
    </>
  );
}
