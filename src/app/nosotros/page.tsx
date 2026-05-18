import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { getTeam } from '@/lib/queries/content';
import { AboutSection } from '@/features/marketing-site/components/AboutSection';
import { TeamGrid } from '@/features/marketing-site/components/TeamGrid';
import { absoluteUrl, SITE_URL, schemaImageUrl } from '@/lib/site-url';

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
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia Gaming España desde 2012 | SocialPro',
    description:
      'Agencia gaming fundada en 2012 por ex-profesionales de esports. 13+ años en iGaming, CS2 y Valorant.',
    images: [absoluteUrl('/og-socialpro.png')],
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
          'SocialPro es una agencia de talentos gaming y esports fundada en Córdoba en 2012. Especialistas en iGaming, CS2 y el ecosistema hispano de creadores.',
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
          'SocialPro es una agencia de talentos gaming y esports fundada en 2012 en Córdoba por ex-profesionales de esports. Especialistas en iGaming (compliance DGOJ), CS2, Valorant y campañas de performance gaming en España y LatAm. El roster gestiona 15M+ de views mensuales con un engagement medio del 8,9%.',
        foundingDate: '2012',
        foundingLocation: {
          '@type': 'Place',
          name: 'Córdoba, España',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Córdoba',
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
            url: 'https://kekoesports.es',
            sameAs: ['https://kekoesports.es'],
            worksFor: { '@id': absoluteUrl('/#organization') },
          },
          {
            '@type': 'Person',
            '@id': absoluteUrl('/#founder-alfonso'),
            name: 'Alfonso Arias',
            alternateName: 'Zack',
            jobTitle: 'COO',
            description:
              'Ex-streamer y creador de contenido gaming. 7+ años en iGaming y esports marketing. Especialista en FTD tracking, compliance DGOJ y gestión de campañas de performance en España y LatAm.',
            sameAs: ['https://www.youtube.com/@zacketizor1'],
            worksFor: { '@id': absoluteUrl('/#organization') },
          },
        ],
        employee: team.map((m) => ({
          '@type': 'Person',
          name: m.name,
          jobTitle: m.role,
          description: m.bio ?? undefined,
          ...(schemaImageUrl(m.photoUrl) ? { image: schemaImageUrl(m.photoUrl) } : {}),
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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div>
        <h1 className="sr-only">Agencia Gaming España desde 2012</h1>

        {/* Definición standalone — 140-160 palabras siempre visibles en DOM.
            Pasaje citable para AI systems sin dependencia de JS ni colapso. */}
        <section className="bg-white pt-16 pb-2">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-base text-sp-muted leading-relaxed">
            <p>
              SocialPro es una agencia especializada en marketing gaming e iGaming para marcas y
              creadores en España y Latinoamérica. Desde 2012, trabaja campañas centradas en Twitch,
              YouTube, Kick e Instagram dentro del ecosistema esports, CS2, Valorant y apuestas
              online reguladas.
            </p>
            <p>
              La agencia combina influencer marketing, gestión de talento y campañas orientadas a
              conversión con un enfoque centrado en compliance y resultados auditables. En el sector
              iGaming, SocialPro integra procesos adaptados a normativa DGOJ, incluyendo supervisión
              de campañas, validación de contenido y coordinación con operadores y afiliados.
            </p>
            <p>
              Actualmente, SocialPro trabaja con una red de creadores especializados en gaming y
              entretenimiento digital, acumulando millones de visualizaciones mensuales en campañas
              para marcas internacionales. Entre los resultados recientes destacan más de 340 FTDs
              verificados en una activación de iGaming y más de 200.000&nbsp;€ en volumen atribuido
              en campañas vinculadas al ecosistema CS2.
            </p>
          </div>
        </section>

        <AboutSection />
        <TeamGrid team={team} />
      </div>
    </>
  );
}
