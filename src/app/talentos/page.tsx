import type { Metadata } from 'next';
import { getTalents } from '@/lib/queries/talents';
import { TalentSection } from '@/features/marketing-site/components/TalentSection';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Streamers y Creadores Gaming de Élite',
  description:
    'Explora el roster de SocialPro: streamers de CS2, Valorant e iGaming en España y LatAm. +15M views/mes, audiencias verificadas y engagement real. Ver perfiles →',
  alternates: {
    canonical: '/talentos',
  },
  openGraph: {
    title: 'Streamers y Creadores Gaming de Élite | SocialPro',
    description:
      'Explora el roster de SocialPro: streamers de CS2, Valorant e iGaming en España y LatAm. +15M views/mes, audiencias verificadas.',
    url: absoluteUrl('/talentos'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Streamers y Creadores Gaming de Élite | SocialPro',
    description:
      'Roster de SocialPro: streamers de CS2, Valorant e iGaming en España y LatAm. +15M views/mes, audiencias verificadas.',
    images: [absoluteUrl('/og-default.jpg')],
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
        name: t.name,
        jobTitle: t.role,
        url: absoluteUrl(`/talentos/${t.slug}`),
        ...(t.photoUrl ? { image: t.photoUrl } : {}),
        worksFor: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <div>
        <h1 className="sr-only">Streamers y Creadores Gaming de Élite</h1>
        <TalentSection talents={talents} />
      </div>
    </>
  );
}
