import type { Metadata } from 'next';
import { getTeam } from '@/lib/queries/content';
import { AboutSection } from '@/features/marketing-site/components/AboutSection';
import { TeamGrid } from '@/features/marketing-site/components/TeamGrid';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Agencia Gaming España desde 2012',
  description:
    'Agencia gaming fundada en 2012 por ex-profesionales de esports. 13+ años especializados en iGaming, CS2 y Valorant en España y LatAm. Conoce al equipo →',
  alternates: {
    canonical: '/nosotros',
  },
  openGraph: {
    title: 'Agencia Gaming España desde 2012 | SocialPro',
    description:
      'Agencia gaming fundada en 2012 por ex-profesionales de esports. 13+ años en iGaming, CS2 y Valorant en España y LatAm.',
    url: absoluteUrl('/nosotros'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia Gaming España desde 2012 | SocialPro',
    description:
      'Agencia gaming fundada en 2012 por ex-profesionales de esports. 13+ años en iGaming, CS2 y Valorant.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

export default async function NosotrosPage() {
  const team = await getTeam();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': absoluteUrl('/nosotros'),
        url: absoluteUrl('/nosotros'),
        name: 'Sobre SocialPro — Agencia Gaming España desde 2012',
        description:
          'SocialPro es una agencia de talentos gaming y esports fundada en Madrid en 2012. Especialistas en iGaming, CS2 y el ecosistema hispano de creadores.',
        inLanguage: 'es',
        isPartOf: { '@id': absoluteUrl('/#website') },
        about: { '@id': absoluteUrl('/#organization') },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Sobre SocialPro', item: absoluteUrl('/nosotros') },
          ],
        },
      },
      {
        '@type': 'Organization',
        '@id': absoluteUrl('/#organization'),
        name: 'SocialPro',
        alternateName: 'SocialPro Gaming Agency',
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/logo.png'),
          width: 512,
          height: 512,
        },
        description:
          'SocialPro es una agencia de talentos gaming y esports fundada en 2012 en Madrid por ex-profesionales de esports. Especialistas en iGaming (compliance DGOJ), CS2, Valorant y campañas de performance gaming en España y LatAm. El roster gestiona 15M+ de views mensuales con un engagement medio del 8,9%.',
        foundingDate: '2012',
        foundingLocation: {
          '@type': 'Place',
          name: 'Madrid, España',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Madrid',
            addressCountry: 'ES',
          },
        },
        areaServed: [
          { '@type': 'Country', name: 'España' },
          { '@type': 'Country', name: 'México' },
          { '@type': 'Country', name: 'Argentina' },
          { '@type': 'Country', name: 'Colombia' },
          { '@type': 'Country', name: 'Chile' },
          { '@type': 'Country', name: 'Perú' },
        ],
        knowsAbout: [
          'iGaming influencer marketing',
          'CS2 esports',
          'Valorant esports',
          'DGOJ compliance Spain',
          'Hispanic gaming market',
          'FTD tracking',
          'Twitch streaming campaigns',
          'YouTube gaming',
          'iGaming LATAM regulation',
        ],
        founder: [
          {
            '@type': 'Person',
            '@id': absoluteUrl('/#founder-pablo'),
            name: 'Pablo Camacho',
            alternateName: 'Kekō',
            jobTitle: 'CEO',
            description:
              'Ex-profesional de CS:GO con 14+ años en esports. Co-fundó SocialPro en 2012 para conectar creadores gaming con marcas en España y LatAm.',
            worksFor: { '@id': absoluteUrl('/#organization') },
          },
          {
            '@type': 'Person',
            '@id': absoluteUrl('/#founder-alfonso'),
            name: 'Alfonso Arias',
            alternateName: 'Zack',
            jobTitle: 'COO',
            description:
              '7+ años en iGaming y esports marketing. Especialista en FTD tracking, compliance DGOJ y gestión de campañas de performance en España y LatAm.',
            worksFor: { '@id': absoluteUrl('/#organization') },
          },
        ],
        employee: team.map((m) => ({
          '@type': 'Person',
          name: m.name,
          jobTitle: m.role,
          description: m.bio ?? undefined,
          ...(m.photoUrl ? { image: m.photoUrl } : {}),
          worksFor: { '@id': absoluteUrl('/#organization') },
        })),
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'marketing@socialpro.es',
          contactType: 'sales',
          availableLanguage: ['Spanish', 'English'],
        },
        sameAs: [
          'https://www.instagram.com/socialproes/',
          'https://x.com/SocialProES',
          'https://www.facebook.com/SocialProES',
          'https://www.linkedin.com/company/socialproes',
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div>
        <h1 className="sr-only">Agencia Gaming España desde 2012</h1>
        <AboutSection />
        <TeamGrid team={team} />
      </div>
    </>
  );
}
