import type { Metadata } from 'next';
import { getCaseStudies } from '@/lib/queries/cases';
import { CasesSection } from '@/features/marketing-site/components/CasesSection';
import { absoluteUrl } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Campañas Gaming — Resultados Reales',
  description:
    'Campañas reales con marcas top: RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones). Ver resultados y metodología de SocialPro →',
  alternates: {
    canonical: '/casos',
  },
  openGraph: {
    title: 'Campañas Gaming — Resultados Reales | SocialPro',
    description:
      'RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones). Campañas gaming con ROI demostrable.',
    url: absoluteUrl('/casos'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campañas Gaming — Resultados Reales | SocialPro',
    description:
      'RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€). Campañas gaming con ROI demostrable.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

export default async function CasosPage() {
  const cases = await getCaseStudies();

  return (
    <div>
      <h1 className="sr-only">Campañas Gaming — Resultados Reales</h1>
      <CasesSection cases={cases} />
    </div>
  );
}
