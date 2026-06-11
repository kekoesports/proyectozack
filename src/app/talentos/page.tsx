import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { getTalents } from '@/lib/queries/talents';
import { TalentSection } from '@/features/marketing-site/components/TalentSection';
import { absoluteUrl, SITE_URL, schemaImageUrl } from '@/lib/site-url';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Streamers y Creadores Gaming de Élite',
  description:
    'Explora el roster de SocialPro: streamers de CS2, Valorant e iGaming en España y LatAm. +15M views/mes, audiencias verificadas y engagement real. Ver perfiles →',
  alternates: {
    canonical: '/talentos',
    languages: {
      es: absoluteUrl('/talentos'),
      en: absoluteUrl('/talents'),
      'x-default': absoluteUrl('/talentos'),
    },
  },
  openGraph: {
    title: 'Streamers y Creadores Gaming de Élite | SocialPro',
    description:
      'Explora el roster de SocialPro: streamers de CS2, Valorant e iGaming en España y LatAm. +15M views/mes, audiencias verificadas.',
    url: absoluteUrl('/talentos'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Streamers y Creadores Gaming de Élite — SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Streamers y Creadores Gaming de Élite | SocialPro',
    description:
      'Roster de SocialPro: streamers de CS2, Valorant e iGaming en España y LatAm. +15M views/mes, audiencias verificadas.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

export default async function TalentosPage() {
  const talents = await getTalents();

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Roster de Talentos Gaming — SocialPro',
    description:
      'Streamers y creadores de contenido gaming gestionados por SocialPro en España y LatAm.',
    url: absoluteUrl('/talentos'),
    inLanguage: 'es',
    numberOfItems: talents.length,
    itemListElement: talents.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Person',
        '@id': absoluteUrl(`/talentos/${t.slug}`),
        name: t.name,
        jobTitle: t.role,
        url: absoluteUrl(`/talentos/${t.slug}`),
        ...(schemaImageUrl(t.photoUrl) ? { image: schemaImageUrl(t.photoUrl) } : {}),
        worksFor: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
      },
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Talentos', url: absoluteUrl('/talentos') },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <div>
        <h1 className="sr-only">Streamers y Creadores Gaming de Élite</h1>
        <TalentSection talents={talents} />
        {/* Internal linking: creator-focused landings */}
        <nav aria-label="Campañas por nicho" className="bg-sp-off border-t border-sp-border py-8">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-sp-muted mb-4">Campañas por nicho</p>
            <div className="flex flex-wrap gap-2">
              {[
                { href: '/influencers-cs2', label: 'Influencers CS2' },
                { href: '/agencia-influencers-valorant', label: 'Influencers Valorant' },
                { href: '/cs2-influencer-marketing', label: 'CS2 Influencer Marketing (EN)' },
                { href: '/valorant-influencers-agency', label: 'Valorant Influencers Agency (EN)' },
                { href: '/esports-marketing-agency', label: 'Esports Marketing Agency (EN)' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-xs font-semibold text-sp-muted hover:text-sp-orange border border-sp-border hover:border-sp-orange rounded-full px-3 py-1.5 transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
