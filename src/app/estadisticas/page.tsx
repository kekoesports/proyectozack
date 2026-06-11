import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { getTopRanking } from '@/lib/queries/rankingEntries';
import { getTwitchRoster } from '@/lib/queries/live';
import { getStatsPosts } from '@/lib/queries/posts';
import { getLastTwitchCheck } from '@/lib/queries/live';
import { ESTADISTICAS_NOINDEX } from '@/lib/feature-flags';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Estadísticas Esports — CS2 y Gaming | SocialPro',
  description:
    'Ranking de equipos CS2, audiencias Twitch y análisis estadístico del ecosistema esports español. Datos en tiempo real del roster de SocialPro.',
  alternates: { canonical: '/estadisticas' },
  robots: ESTADISTICAS_NOINDEX ? { index: false, follow: true } : undefined,
  openGraph: {
    title: 'Estadísticas Esports — CS2 y Gaming | SocialPro',
    description:
      'Ranking de equipos, audiencias Twitch y estadísticas CS2. El hub de datos esports de SocialPro.',
    url: absoluteUrl('/estadisticas'),
    type: 'website',
    locale: 'es_ES',
    images: [
      {
        url: absoluteUrl('/og-socialpro.png'),
        width: 1200,
        height: 630,
        alt: 'SocialPro Estadísticas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Estadísticas Esports | SocialPro',
    description: 'Ranking de equipos, Twitch en directo y análisis estadístico CS2.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

function buildJsonLd(rankingCount: number, articleCount: number) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': absoluteUrl('/estadisticas#collection'),
        url: absoluteUrl('/estadisticas'),
        name: 'Estadísticas Esports — SocialPro',
        description:
          'Ranking de equipos CS2, audiencias Twitch y artículos de estadísticas del ecosistema SocialPro.',
        isPartOf: { '@id': absoluteUrl('/#website') },
        publisher: { '@id': absoluteUrl('/#organization') },
        inLanguage: 'es',
        numberOfItems: rankingCount + articleCount,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'SocialPro', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Estadísticas', item: absoluteUrl('/estadisticas') },
        ],
      },
    ],
  };
}

export default async function EstadisticasPage() {
  const [ranking, roster, statsPosts, lastCheck] = await Promise.all([
    getTopRanking(10),
    getTwitchRoster(),
    getStatsPosts(8),
    getLastTwitchCheck(),
  ]);

  const jsonLd = buildJsonLd(ranking.length, statsPosts.length);

  return (
    <>
      <script
        type="application/ld+json"
        // safe: safeJsonLd escapa < para prevenir XSS via </script>
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="min-h-screen bg-sp-black text-white">
        {/* Hero */}
        <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-sp-orange mb-3">
              Datos en tiempo real
            </p>
            <h1 className="font-display font-black uppercase text-5xl sm:text-6xl lg:text-7xl leading-none mb-4">
              ESTADÍSTICAS
            </h1>
            <p className="text-white/50 max-w-2xl text-base leading-relaxed">
              Ranking de equipos CS2, audiencias Twitch del roster SocialPro y análisis
              estadístico del ecosistema esports español.
            </p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-16">

          {/* ── Ranking de equipos ───────────────────────────────────────── */}
          <section aria-labelledby="ranking-heading">
            <div className="flex items-center justify-between mb-5">
              <h2
                id="ranking-heading"
                className="font-display font-black uppercase text-2xl tracking-wide"
              >
                Ranking de equipos
              </h2>
              <span className="text-xs text-white/30 font-semibold uppercase tracking-wider">
                CS2 Tier ES
              </span>
            </div>

            {ranking.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
                <p className="text-white/30 text-sm">Ranking en construcción.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/30 w-10">#</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/30">Equipo</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/30 hidden sm:table-cell">País</th>
                      <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/30">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`font-display font-black text-lg ${
                              entry.position <= 3 ? 'text-sp-orange' : 'text-white/30'
                            }`}
                          >
                            {entry.position}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {entry.teamLogo ? (
                              <Image
                                src={entry.teamLogo}
                                alt={entry.teamName}
                                width={28}
                                height={28}
                                className="w-7 h-7 object-contain rounded flex-shrink-0"
                                unoptimized
                              />
                            ) : (
                              <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-white/30">
                                  {entry.teamName.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="font-semibold text-white">{entry.teamName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-white/40 text-xs hidden sm:table-cell">
                          {entry.country ?? '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-display font-bold text-base text-white">
                            {entry.points.toLocaleString('es-ES')}
                          </span>
                          <span className="text-white/30 text-xs ml-1">pts</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Streamers Twitch ─────────────────────────────────────────── */}
          <section aria-labelledby="streamers-heading">
            <div className="flex items-center justify-between mb-5">
              <h2
                id="streamers-heading"
                className="font-display font-black uppercase text-2xl tracking-wide"
              >
                Streamers en directo
              </h2>
              <div className="flex items-center gap-3">
                {lastCheck && (
                  <span className="text-[10px] text-white/25 tabular-nums">
                    Act. {lastCheck.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <Link
                  href="/news/live"
                  className="text-xs text-sp-orange hover:text-sp-orange/80 font-semibold transition-colors"
                >
                  Ver todos →
                </Link>
              </div>
            </div>

            {roster.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
                <p className="text-white/30 text-sm">Sin datos de streamers disponibles.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {roster.slice(0, 10).map((streamer) => (
                  <a
                    key={streamer.talentId}
                    href={streamer.streamUrl ?? `https://twitch.tv/${streamer.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-xl border border-white/10 bg-white/[0.03] hover:border-sp-orange/40 hover:bg-white/[0.06] transition-all overflow-hidden p-4 flex flex-col items-center gap-3"
                  >
                    {streamer.isLive && (
                      <span className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-red-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide text-white z-10">
                        <span className="w-1 h-1 rounded-full bg-white animate-pulse inline-block" />
                        Live
                      </span>
                    )}
                    <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                      {streamer.photoUrl ? (
                        <Image
                          src={streamer.photoUrl}
                          alt={streamer.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white/30 text-lg font-bold">
                            {streamer.name.slice(0, 1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-center min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-full">{streamer.name}</p>
                      {streamer.isLive && streamer.viewerCount != null && streamer.viewerCount > 0 ? (
                        <p className="text-[10px] text-sp-orange font-semibold mt-0.5">
                          {streamer.viewerCount.toLocaleString('es-ES')} viewers
                        </p>
                      ) : (
                        <p className="text-[10px] text-white/30 mt-0.5">Offline</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* ── Artículos de estadísticas ────────────────────────────────── */}
          <section aria-labelledby="articles-heading">
            <div className="flex items-center justify-between mb-5">
              <h2
                id="articles-heading"
                className="font-display font-black uppercase text-2xl tracking-wide"
              >
                Análisis y estadísticas
              </h2>
            </div>

            {statsPosts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
                <p className="text-white/30 text-sm">
                  Próximamente: análisis competitivos y estadísticas CS2.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {statsPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/news/${post.slug}`}
                    className="group rounded-xl border border-white/10 bg-white/[0.03] hover:border-sp-orange/40 hover:bg-white/[0.05] transition-all overflow-hidden"
                  >
                    {post.coverUrl && (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-white/5">
                        <Image
                          src={post.coverUrl}
                          alt={post.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sp-orange bg-sp-orange/10 px-2 py-0.5 rounded">
                          Estadística
                        </span>
                        {post.readMinutes > 0 && (
                          <span className="text-[10px] text-white/30">{post.readMinutes} min</span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-sp-orange transition-colors">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-xs text-white/40 mt-1.5 line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                      )}
                      {post.publishedAt && (
                        <p className="text-[10px] text-white/25 mt-3">
                          {new Date(post.publishedAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  );
}
