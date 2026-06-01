import type { Metadata } from 'next';
import { getCaseStudies } from '@/lib/queries/cases';
import { CasesSection } from '@/features/marketing-site/components/CasesSection';
import { absoluteUrl } from '@/lib/site-url';
import { safeJsonLd } from '@/lib/safeJsonLd';

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': absoluteUrl('/casos'),
    url: absoluteUrl('/casos'),
    name: 'Campañas Gaming — Resultados Reales | SocialPro',
    description:
      'Campañas reales con marcas top: RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones). Resultados y metodología de SocialPro.',
    publisher: { '@type': 'Organization', name: 'SocialPro', url: absoluteUrl('/') },
    hasPart: cases.map((c) => ({
      '@type': 'WebPage',
      '@id': absoluteUrl(`/casos/${c.slug}`),
      url: absoluteUrl(`/casos/${c.slug}`),
      name: c.title,
      ...(c.excerpt ? { description: c.excerpt } : {}),
    })),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <h1 className="sr-only">Campañas Gaming — Resultados Reales</h1>
      <CasesSection cases={cases} />
    </div>
  );
}
