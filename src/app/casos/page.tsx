import type { Metadata } from 'next';
import { getCaseStudies } from '@/lib/queries/cases';
import { CasesSection } from '@/features/marketing-site/components/CasesSection';
import { absoluteUrl } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Campañas Gaming — Resultados Reales',
  description:
    'Resultados reales: campañas con RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones). Así trabaja SocialPro con las marcas.',
  alternates: {
    canonical: '/casos',
  },
  openGraph: {
    title: 'Campañas Gaming — Resultados Reales | SocialPro',
    description:
      'Resultados reales: campañas con RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones).',
    url: absoluteUrl('/casos'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campañas Gaming — Resultados Reales | SocialPro',
    description:
      'Resultados reales: campañas con RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones).',
    images: [absoluteUrl('/og-default.jpg')],
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
