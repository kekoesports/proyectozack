import type { Metadata } from 'next';
import Link from 'next/link';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { getTeam, getBrands } from '@/lib/queries/content';
import { NosotrosHero } from '@/features/marketing-site/components/NosotrosHero';
import { NosotrosPorQue } from '@/features/marketing-site/components/NosotrosPorQue';
import { BrandsCarousel } from '@/features/marketing-site/components/BrandsCarousel';
import { TeamGrid } from '@/features/marketing-site/components/TeamGrid';
import { PressSection } from '@/features/marketing-site/components/PressSection';
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
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Agencia Gaming España desde 2012 — SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia Gaming España desde 2012 | SocialPro',
    description:
      'Agencia gaming fundada en 2012 por ex-profesionales de esports. 13+ años en iGaming, CS2 y Valorant.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const STATS = [
  { value: '13+',   label: 'Años en gaming' },
  { value: '15M+',  label: 'Views mensuales' },
  { value: '+340',  label: 'FTDs verificados' },
  { value: '6',     label: 'Mercados activos' },
] as const;

export default async function NosotrosPage() {
  const [team, brands] = await Promise.all([getTeam(), getBrands()]);

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
            alternateName: ['Keko', 'Kekō', 'Pablo Camacho Carrión'],
            jobTitle: 'CEO',
            description:
              'Ex-profesional de CS:GO con más de una década en esports. Fundador y CEO de SocialPro, conecta creadores gaming con marcas en España y LatAm.',
            url: 'https://kekoesports.es',
            sameAs: [
              'https://kekoesports.es',
              'https://www.linkedin.com/in/pablocamachocarrion/',
              'https://x.com/kekOesports',
              'https://www.instagram.com/kekoesports/',
            ],
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
        subjectOf: [
          {
            '@type': 'PodcastEpisode',
            name: "'Keko', un referente andaluz de los eSports, lanza la agencia SocialPro",
            url: 'https://audio.canalsurmas.es/videos/detail/374811-podcast-todo-e-games-13062026mp3',
            datePublished: '2026-06-13',
            actor: {
              '@type': 'Person',
              '@id': absoluteUrl('/#founder-pablo'),
              name: 'Pablo Camacho',
              alternateName: ['Keko', 'Kekō'],
            },
            partOfSeries: {
              '@type': 'PodcastSeries',
              name: 'Todo e-Games',
              url: 'https://www.canalsur.es/radio/programas/todo-egames/podcast/19795725.html',
              publisher: {
                '@type': 'Organization',
                name: 'Canal Sur Radio',
                url: 'https://www.canalsur.es',
              },
            },
          },
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
      {/* sr-only H1 para SEO — el visual está en NosotrosHero */}
      <h1 className="sr-only">Agencia Gaming España desde 2012</h1>

      {/* ── Hero 2 columnas ──────────────────────────────────────── */}
      <NosotrosHero brands={brands} />

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div className="bg-sp-dark py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <dt className="font-display text-4xl font-black gradient-text leading-none">{value}</dt>
                <dd className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mt-2">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ── Por qué SocialPro ────────────────────────────────────── */}
      <NosotrosPorQue />

      {/* ── Editorial — layout 2 columnas, pull quote + definición ─ */}
      <section className="bg-white py-16 md:py-20 border-t border-sp-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[2fr_3fr] gap-12 lg:gap-20 items-start">

            {/* Pull quote / manifiesto */}
            <div>
              <p className="font-display text-2xl md:text-[1.7rem] font-black uppercase leading-[1.15] text-sp-dark mb-6">
                &ldquo;Resultados verificados desde el panel del operador,
                no capturas de pantalla.&rdquo;
              </p>
              <div className="border-t border-sp-border pt-5">
                <Link href="/keko" className="text-xs font-bold uppercase tracking-[0.25em] text-sp-orange hover:underline">
                  Pablo Camacho
                </Link>
                <p className="text-xs text-sp-muted mt-1">CEO · SocialPro · Desde 2012</p>
              </div>
            </div>

            {/* Definición — texto SEO siempre en DOM */}
            <div className="space-y-5 text-sm text-sp-muted leading-relaxed">
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

          </div>
        </div>
      </section>

      {/* ── Apariciones en medios ────────────────────────────────── */}
      <PressSection />

      {/* ── Marcas — mismo carrusel que en homepage ──────────────── */}
      <BrandsCarousel brands={brands} />

      {/* ── Equipo ───────────────────────────────────────────────── */}
      <TeamGrid team={team} />

      {/* ── CTA final ────────────────────────────────────────────── */}
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-white leading-tight mb-4">
            ¿Tu marca busca creadores gaming?
          </h2>
          <p className="text-white/45 text-sm mb-2 leading-relaxed">
            1. Cuéntanos producto, mercado y objetivo
          </p>
          <p className="text-white/45 text-sm mb-2 leading-relaxed">
            2. Propuesta con creadores seleccionados en 48h
          </p>
          <p className="text-white/45 text-sm mb-8 leading-relaxed">
            3. Sin compromiso — decides si avanzar
          </p>
          <Link
            href="/contacto?type=brand"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-10 py-4 rounded-full hover:opacity-90 transition-opacity"
          >
            Iniciar propuesta →
          </Link>
          <p className="text-white/25 text-[11px] font-semibold uppercase tracking-widest mt-4">
            Respuesta en 24h · Sin compromiso
          </p>
        </div>
      </section>
    </>
  );
}
