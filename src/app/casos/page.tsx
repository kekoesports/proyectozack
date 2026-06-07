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
    languages: {
      es: absoluteUrl('/casos'),
      en: absoluteUrl('/cases'),
      'x-default': absoluteUrl('/casos'),
    },
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

      {/* Hero — solo en /casos, no en home (CasesSection se reutiliza) */}
      <section className="bg-sp-dark pt-32 pb-14 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-sp-orange/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-sp-purple/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sp-orange/30 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-sp-orange" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sp-orange">
              Casos de Éxito
            </span>
          </div>
          <h1 className="font-display mb-6 text-3xl font-black uppercase leading-none text-white sm:text-4xl md:text-5xl lg:text-6xl">
            Campañas Reales.<br />
            <span className="gradient-text">Resultados Verificados.</span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
            Cada caso documenta una campaña ejecutada por SocialPro con marcas de gaming, esports
            e iGaming. Datos reales: alcance, conversiones y ROI medible, sin inflación de métricas.
          </p>
        </div>
      </section>

      <CasesSection cases={cases} />
    </div>
  );
}
