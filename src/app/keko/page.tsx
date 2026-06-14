import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { getTeam } from '@/lib/queries/content';
import { absoluteUrl, SITE_URL, schemaImageUrl } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Keko — Pablo Camacho Carrión | Fundador & CEO de SocialPro',
  description:
    'Keko (Pablo Camacho Carrión), ex-profesional de CS:GO y fundador de SocialPro. Más de una década en esports y gaming en España. Referente andaluz del gaming y los esports.',
  alternates: {
    canonical: '/keko',
  },
  openGraph: {
    title: 'Keko — Pablo Camacho Carrión | Fundador & CEO de SocialPro',
    description:
      'Keko (Pablo Camacho Carrión), fundador y CEO de SocialPro. Más de una década en esports y gaming en España y LatAm.',
    url: absoluteUrl('/keko'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Keko — Pablo Camacho Carrión, Fundador & CEO de SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Keko — Pablo Camacho Carrión | SocialPro',
    description: 'Fundador y CEO de SocialPro. Más de una década en esports y gaming en España.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const SOCIAL_LINKS = [
  { label: 'kekoesports.es', href: 'https://kekoesports.es', external: true },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/pablocamachocarrion/', external: true },
  { label: 'X / Twitter', href: 'https://x.com/kekOesports', external: true },
  { label: 'Instagram', href: 'https://www.instagram.com/kekoesports/', external: true },
];

export default async function KekoPage() {
  const team = await getTeam();
  const pablo = team.find(
    (m) => m.name.includes('Pablo') || m.name.toLowerCase().includes('keko'),
  );

  const photoUrl = pablo?.photoUrl ?? null;
  const initials = pablo?.initials ?? 'PC';
  const gradientC1 = pablo?.gradientC1 ?? '#f5632a';
  const gradientC2 = pablo?.gradientC2 ?? '#8b3aad';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': absoluteUrl('/keko'),
        url: absoluteUrl('/keko'),
        name: 'Keko — Pablo Camacho Carrión',
        inLanguage: 'es',
        isPartOf: { '@id': absoluteUrl('/#website') },
        mainEntity: {
          '@type': 'Person',
          '@id': absoluteUrl('/keko#person'),
          name: 'Pablo Camacho',
          alternateName: ['Keko', 'Kekō', 'Pablo Camacho Carrión'],
          jobTitle: 'Fundador y CEO',
          description:
            'Ex-profesional de CS:GO con más de una década en el ecosistema esports de España. Fundador y CEO de SocialPro, agencia de talentos gaming e iGaming en España y LatAm.',
          url: absoluteUrl('/keko'),
          sameAs: [
            absoluteUrl('/#founder-pablo'),
            'https://kekoesports.es',
            'https://www.linkedin.com/in/pablocamachocarrion/',
            'https://x.com/kekOesports',
            'https://www.instagram.com/kekoesports/',
          ],
          worksFor: {
            '@type': 'Organization',
            '@id': absoluteUrl('/#organization'),
            name: 'SocialPro',
            url: SITE_URL,
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Córdoba',
            addressRegion: 'Andalucía',
            addressCountry: 'ES',
          },
          knowsAbout: [
            'esports',
            'CS:GO',
            'CS2',
            'Valorant',
            'iGaming influencer marketing',
            'Twitch streaming',
            'gaming talent management',
            'DGOJ compliance',
          ],
          subjectOf: [
            {
              '@type': 'PodcastEpisode',
              name: "'Keko', un referente andaluz de los eSports, lanza la agencia SocialPro",
              url: 'https://audio.canalsurmas.es/videos/detail/374811-podcast-todo-e-games-13062026mp3',
              datePublished: '2026-06-13',
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
          ...(schemaImageUrl(photoUrl) ? { image: schemaImageUrl(photoUrl) } : {}),
        },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Keko — Pablo Camacho', item: absoluteUrl('/keko') },
          ],
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* ── Hero ── */}
      <section className="bg-sp-black pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <Link
            href="/nosotros"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-10"
          >
            <span aria-hidden="true">←</span> Sobre SocialPro
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end gap-7">
            {/* Avatar */}
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-none"
              style={{ background: `linear-gradient(135deg, ${gradientC1}, ${gradientC2})` }}
            >
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt="Keko — Pablo Camacho Carrión"
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl font-black text-white">{initials}</span>
                </div>
              )}
            </div>

            {/* Name + role */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sp-orange mb-2">
                Fundador &amp; CEO · SocialPro
              </p>
              <h1 className="font-display text-5xl md:text-6xl font-black uppercase text-white leading-none">
                Keko
              </h1>
              <p className="text-white/50 text-sm font-medium mt-2">
                Pablo Camacho Carrión · Córdoba, España
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bio ── */}
      <section className="bg-white py-14 md:py-16 border-t border-sp-border">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <div className="space-y-5 text-base text-sp-muted leading-relaxed">
            <p>
              Keko es el alias gaming de Pablo Camacho Carrión, fundador y CEO de{' '}
              <Link href="/nosotros" className="text-sp-orange font-medium hover:underline">
                SocialPro
              </Link>
              . Lleva más de una década en el ecosistema esports de España, primero como jugador
              semiprofesional de CS:GO y después como creador de contenido y empresario.
            </p>
            <p>
              Fundó SocialPro junto a Alfonso &ldquo;Zack&rdquo; Arias con el objetivo de conectar creadores
              de contenido gaming con marcas que buscan resultados verificables en Twitch, YouTube
              y plataformas digitales. La agencia opera con creadores especializados en iGaming,
              CS2, Valorant y entretenimiento gaming para España y Latinoamérica.
            </p>
            <p>
              Su perfil combina experiencia competitiva en esports, conocimiento profundo del
              sector y un enfoque en resultados auditables: los datos de campaña provienen del
              panel del operador, no de capturas de pantalla. Esa perspectiva de ex-jugador
              convirtiendo la industria del gaming en negocio real es lo que distingue el
              enfoque de SocialPro.
            </p>
            <p>
              Con base en Córdoba, su trabajo abarca{' '}
              <Link href="/servicios/igaming" className="text-sp-orange font-medium hover:underline">
                compliance DGOJ para campañas iGaming
              </Link>
              , gestión de talento gaming y{' '}
              <Link href="/casos" className="text-sp-orange font-medium hover:underline">
                campañas de performance
              </Link>{' '}
              en España y seis mercados de Latinoamérica.
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['CS:GO · CS2', 'Esports', 'iGaming', 'Twitch', 'YouTube', 'Córdoba · Andalucía'].map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border border-sp-border text-sp-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prensa ── */}
      <section className="bg-sp-black py-14 md:py-16" aria-labelledby="keko-press-heading">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sp-orange mb-3">
            Prensa · Radio
          </p>
          <h2
            id="keko-press-heading"
            className="font-display text-2xl md:text-3xl font-black uppercase text-white mb-8 leading-tight"
          >
            Apariciones en medios
          </h2>

          <article className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.18] transition-colors">
            <div className="h-[3px] bg-sp-grad" aria-hidden="true" />
            <div className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sp-orange mb-3">
                13 de junio de 2026 · Radio · Podcast
              </p>
              <p className="font-display font-black uppercase text-white text-xl md:text-2xl leading-none mb-1">
                Canal Sur Radio
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 mb-4">
                RTVA · Andalucía · Todo e-Games
              </p>
              <p className="text-sm text-white/55 leading-relaxed mb-5">
                Keko participa en <em>Todo e-Games</em> de Canal Sur Radio para hablar sobre su
                trayectoria en esports y cómo SocialPro conecta creadores gaming con marcas en
                España y LatAm. Una conversación sobre el gaming andaluz y su proyección internacional.
              </p>
              <a
                href="https://audio.canalsurmas.es/videos/detail/374811-podcast-todo-e-games-13062026mp3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-sp-orange transition-colors"
                aria-label="Escuchar el episodio de Todo e-Games en Canal Sur Radio (abre en nueva pestaña)"
              >
                Escuchar episodio
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* ── Links sociales ── */}
      <section className="bg-sp-black border-t border-white/[0.05] pb-16">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/30 mb-4">
            Perfiles
          </p>
          <div className="flex flex-wrap gap-3">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] px-4 py-2.5 rounded-full border border-white/[0.1] text-white/50 hover:text-white hover:border-white/30 transition-colors"
              >
                {link.label}
                {link.external && (
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                )}
              </a>
            ))}
            <Link
              href="/nosotros"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] px-4 py-2.5 rounded-full border border-white/[0.1] text-white/50 hover:text-white hover:border-white/30 transition-colors"
            >
              SocialPro — Equipo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
