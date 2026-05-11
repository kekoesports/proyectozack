import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { getCs2RosterForSidebar } from '@/lib/queries/live';
import { absoluteUrl } from '@/lib/site-url';
import { deriveSceneRole, type SceneRole } from '@/lib/utils/news-roles';
import { LiveBar } from '@/features/news/live-bar/LiveBar';
import { buildLiveBarItems } from '@/features/news/live-bar/buildLiveBarItems';
import { NewsLiveFilters } from '@/features/news/live-page/components/NewsLiveFilters';
import { StreamsLiveGrid } from '@/features/news/live-page/components/StreamsLiveGrid';
import { MatchesToday } from '@/features/news/live-page/components/MatchesToday';
import { LatestRosterMoves } from '@/features/news/live-page/components/LatestRosterMoves';
import { Calendar7Days } from '@/features/news/live-page/components/Calendar7Days';
import { Cs2LabCard } from '@/components/cs2-lab/Cs2LabCard';
import { getMatchesToday, getMatchesNext7Days } from '@/features/news/live-page/data/seedMatches';
import { getLatestRosterMoves } from '@/features/news/live-page/data/seedRosterMoves';
import { getCalendar7Days } from '@/features/news/live-page/data/seedCalendar';

// Streams cambian rápido (cron after() pollea on-demand). Bajo revalidate
// más agresivo que /news pero sigue Hobby-friendly: ~60 invocations/h con
// tráfico actual, dentro del cap.
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: 'SocialPro Live · CS2 hispano · streams · partidos · roster moves' },
  description:
    'Hub editorial de CS2 hispano: streams en directo del roster SocialPro, partidos del día, roster moves recientes y calendario competitivo del tier europeo.',
  alternates: { canonical: '/news/live' },
  openGraph: {
    title: 'SocialPro Live · CS2 hispano',
    description:
      'Streams CS2 en directo · partidos hoy · roster moves · calendario competitivo. Hub editorial SocialPro News.',
    url: absoluteUrl('/news/live'),
    type: 'website',
    locale: 'es_ES',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'SocialPro Live CS2' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SocialPro Live · CS2 hispano',
    description:
      'Streams CS2 en directo · partidos hoy · roster moves · calendario.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': absoluteUrl('/news/live#collection'),
      url: absoluteUrl('/news/live'),
      name: 'SocialPro Live · CS2 hispano',
      description:
        'Hub editorial CS2 hispano: streams en directo, partidos del día, roster moves y calendario.',
      isPartOf: { '@id': absoluteUrl('/#website') },
      publisher: { '@id': absoluteUrl('/#organization') },
      inLanguage: 'es',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'SocialPro', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'News', item: absoluteUrl('/news') },
        { '@type': 'ListItem', position: 3, name: 'Live', item: absoluteUrl('/news/live') },
      ],
    },
  ],
} satisfies Record<string, unknown>;

type PageProps = {
  searchParams: Promise<{ country?: string; role?: string }>;
};

const VALID_COUNTRIES = new Set(['ES', 'AR', 'MX', 'CL', 'CO', 'PE', 'UY', 'VE']);
const VALID_ROLES = new Set<SceneRole>(['pro', 'tier2', 'analista', 'creator', 'coach']);

export default async function NewsLivePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const requestedCountry = (sp.country ?? '').toUpperCase();
  const requestedRole = (sp.role ?? '').toLowerCase();
  const activeCountry = VALID_COUNTRIES.has(requestedCountry) ? requestedCountry : null;
  const activeRole: SceneRole | null =
    VALID_ROLES.has(requestedRole as SceneRole) ? (requestedRole as SceneRole) : null;

  const [allCreators, liveBarItems] = await Promise.all([
    getCs2RosterForSidebar(),
    buildLiveBarItems(),
  ]);

  // Counts antes del filtro (para chips)
  const byCountry: Record<string, number> = {};
  const byRole: Record<SceneRole, number> = { pro: 0, tier2: 0, analista: 0, creator: 0, coach: 0 };
  const counts = {
    total: allCreators.length,
    byCountry,
    byRole,
  };
  for (const c of allCreators) {
    if (c.country) counts.byCountry[c.country] = (counts.byCountry[c.country] ?? 0) + 1;
    const r = deriveSceneRole(c.role, c.game);
    counts.byRole[r] = (counts.byRole[r] ?? 0) + 1;
  }

  const filtered = allCreators.filter((c) => {
    if (activeCountry && c.country !== activeCountry) return false;
    if (activeRole && deriveSceneRole(c.role, c.game) !== activeRole) return false;
    return true;
  });

  const matchesToday = getMatchesToday();
  const matchesWeek = getMatchesNext7Days();
  const rosterMoves = getLatestRosterMoves(4);
  const calendarDays = getCalendar7Days();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <main className="bg-sp-black text-white">
        <LiveBar items={liveBarItems} />

        {/* Hero compact */}
        <section className="relative bg-sp-black border-b border-white/[0.05] overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at center, rgba(245,99,42,0.10), rgba(196,40,128,0.05) 40%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-10 pb-8 md:pt-14 md:pb-10">
            <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-wider text-white/35 mb-5 flex items-center gap-2">
              <Link href="/news" className="hover:text-white/70 transition-colors">News</Link>
              <span aria-hidden>/</span>
              <span className="text-sp-orange font-bold">Live</span>
            </nav>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-3">
                  SocialPro Live · CS2 ESP+LATAM
                </p>
                <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight leading-[0.9] flex items-center gap-3">
                  <span aria-hidden className="relative inline-flex flex-none w-3.5 h-3.5 md:w-5 md:h-5 rounded-full bg-red-500 align-middle">
                    <span aria-hidden className="absolute inset-0 rounded-full bg-red-500 motion-safe:animate-ping opacity-70" />
                  </span>
                  <span className="bg-sp-grad bg-clip-text text-transparent">En directo</span>
                </h1>
                <p className="mt-3 text-sm text-white/55 max-w-xl">
                  Streams, partidos, roster moves y calendario competitivo. En tiempo real.
                </p>
              </div>
              <Link
                href="/news"
                className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/55 hover:text-white transition-colors whitespace-nowrap"
              >
                ← Volver al hub editorial
              </Link>
            </div>
          </div>
        </section>

        {/* Filters strip */}
        <section className="bg-sp-black border-b border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 md:py-5">
            <NewsLiveFilters counts={counts} />
          </div>
        </section>

        {/* Streams + Matches today */}
        <section className="bg-sp-black py-10 md:py-14 border-b border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-10">
              <div>
                <header className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-1.5">
                    Streams
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight leading-[0.95]">
                    Roster CS2 ahora mismo
                  </h2>
                </header>
                <StreamsLiveGrid
                  creators={filtered}
                  emptyMessage={
                    activeCountry || activeRole
                      ? 'Sin creators en este filtro. Prueba otros chips.'
                      : 'Sin creators disponibles.'
                  }
                />
              </div>
              <aside className="space-y-6">
                <MatchesToday matches={matchesToday.length > 0 ? matchesToday : matchesWeek.slice(0, 3)} />
              </aside>
            </div>
          </div>
        </section>

        {/* Roster moves + Calendar — warm paper section para ritmo magazine */}
        <section className="bg-[#F5F3F0] text-sp-black py-14 md:py-20 border-b border-black/[0.05]">
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
              <div>
                <header className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-1.5">
                    Movimientos
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight leading-[0.95] text-sp-black">
                    Roster moves recientes
                  </h2>
                </header>
                <LatestRosterMoves moves={rosterMoves} tone="paper" />
              </div>
              <div>
                <header className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-1.5">
                    Agenda
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight leading-[0.95] text-sp-black">
                    Próximos 7 días
                  </h2>
                </header>
                <Calendar7Days days={calendarDays} tone="paper" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Apuesta Segura compact */}
        <section className="bg-sp-black py-10 md:py-12">
          <div className="max-w-5xl mx-auto px-5 md:px-8">
            <Cs2LabCard variant="compact" ctaId="news_live_apuesta_segura_cs2" />
          </div>
        </section>
      </main>
    </>
  );
}
