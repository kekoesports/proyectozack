import type { Metadata } from 'next';
import Link from 'next/link';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { getNewsPosts } from '@/lib/queries/posts';
import { getEditorialSlots } from '@/lib/queries/editorialSlots';
import { getUpcomingAgendaItems } from '@/lib/queries/agendaItems';
import { isNewsCategorySlug, type NewsCategorySlug } from '@/lib/utils/news';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { NewsHeroCard, NewsSecondaryCard } from '@/features/news/components/NewsHero';
import { LiveBar } from '@/features/news/live-bar/LiveBar';
import { buildLiveBarItems } from '@/features/news/live-bar/buildLiveBarItems';
import { NewsFilters } from '@/features/news/components/NewsFilters';
import { NewsGrid } from '@/features/news/components/NewsGrid';
import { NewsHubSidebar } from '@/features/news/components/NewsHubSidebar';
import { NewsHubBottomBlocks } from '@/features/news/components/NewsHubBottomBlocks';
import { SorteosCtaCard } from '@/features/news/components/SorteosCtaCard';
import { CodigosCtaCard } from '@/features/news/components/CodigosCtaCard';
import { NewsCrossBlogLink } from '@/features/news/components/NewsCrossBlogLink';

export const revalidate = 120;

export const metadata: Metadata = {
  title: {
    absolute: 'SocialPro News — Esports, CS2 y comunidad gaming',
  },
  description:
    'Actualidad esports, análisis competitivo CS2, perfiles de creators y cobertura del tier europeo. La sección editorial de SocialPro.',
  alternates: { canonical: '/news' },
  openGraph: {
    title: 'SocialPro News — Esports, CS2 y comunidad gaming',
    description:
      'Editorial esports y CS2 dentro del ecosistema SocialPro. Análisis competitivo, creators, comunidad y tier europeo.',
    url: absoluteUrl('/news'),
    type: 'website',
    locale: 'es_ES',
    images: [
      {
        url: absoluteUrl('/og-socialpro.png'),
        width: 1200,
        height: 630,
        alt: 'SocialPro News',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SocialPro News',
    description:
      'Esports, CS2, creators y comunidad. La sección editorial de SocialPro.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

type ItemListPost = { slug: string; title: string };

function buildJsonLd(items: readonly ItemListPost[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': absoluteUrl('/news#collection'),
        url: absoluteUrl('/news'),
        name: 'SocialPro News',
        description:
          'Sección editorial de SocialPro: actualidad esports, análisis competitivo CS2, creators, comunidad y tier europeo.',
        isPartOf: { '@id': absoluteUrl('/#website') },
        publisher: { '@id': absoluteUrl('/#organization') },
        inLanguage: 'es',
        mainEntity: { '@id': absoluteUrl('/news#itemlist') },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'SocialPro', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'News', item: absoluteUrl('/news') },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': absoluteUrl('/news#itemlist'),
        name: 'Últimas news SocialPro',
        numberOfItems: items.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: items.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: absoluteUrl(`/news/${p.slug}`),
          name: p.title,
        })),
      },
    ],
  } satisfies Record<string, unknown>;
}

type PageProps = {
  searchParams: Promise<{ cat?: string; tag?: string }>;
};

export default async function NewsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const requestedCat = sp.cat ?? '';
  const activeCategory: NewsCategorySlug | null = isNewsCategorySlug(requestedCat)
    ? requestedCat
    : null;
  const requestedTag = (sp.tag ?? '').toLowerCase().trim();
  const activeTag: string | null =
    requestedTag.length > 0 && requestedTag.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedTag)
      ? requestedTag
      : null;

  const [allPosts, slots, liveBarItems, agenda] = await Promise.all([
    getNewsPosts(),
    getEditorialSlots(),
    buildLiveBarItems(),
    getUpcomingAgendaItems(5),
  ]);

  // Resolver slots con fallback a posts más recientes
  const slotMap = Object.fromEntries(slots.map((s) => [s.slot, s.post]));
  const matchSlot = slots.find((s) => s.slot === 'featured_match');
  const featuredMatch = (matchSlot?.meta ?? null) as { team1?: string; team2?: string; tournament?: string; matchDate?: string; matchTime?: string } | null;
  const sortedPosts = [...allPosts].sort(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );

  const hero = slotMap['hero'] ?? sortedPosts[0] ?? null;
  const secondary1 = slotMap['secondary_1'] ?? sortedPosts.find((p) => p.slug !== hero?.slug) ?? null;
  const secondary2 =
    slotMap['secondary_2'] ??
    sortedPosts.find((p) => p.slug !== hero?.slug && p.slug !== secondary1?.slug) ??
    null;
  const featuredInterview = slotMap['featured_interview'] ?? null;
  const featuredClip = slotMap['featured_clip'] ?? null;

  const trending = [secondary1, secondary2].filter(Boolean) as typeof allPosts;

  // Grid: todos los posts con filtros aplicados
  const tagFiltered = activeTag
    ? allPosts.filter((p) => (p.tags ?? []).includes(activeTag))
    : allPosts;
  const grid = [...tagFiltered].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));

  // JSON-LD: top 10 más recientes
  const jsonLd = buildJsonLd(
    sortedPosts.slice(0, 10).map((p) => ({ slug: p.slug, title: p.title })),
  );

  if (!hero) {
    return (
      <main className="min-h-[60vh] bg-sp-black text-white flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-3">
            SocialPro News
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
            Empezamos pronto
          </h1>
          <p className="text-sm text-white/55">
            La sección editorial está en marcha. Vuelve en breve para
            actualidad esports, análisis competitivo y perfiles de creators.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <main className="bg-sp-black text-white">
        {/* LiveBar */}
        <LiveBar items={liveBarItems} />

        {/* Hero editorial — 3 columnas */}
        <section className="relative border-b border-white/[0.06] overflow-hidden">
          {/* Gradientes de ambiente al nivel de sección */}
          <div aria-hidden className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full pointer-events-none opacity-60" style={{ background: 'radial-gradient(circle, rgba(245,99,42,0.10), rgba(196,40,128,0.05) 50%, transparent 70%)', filter: 'blur(80px)' }} />
          <div aria-hidden className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full pointer-events-none opacity-40" style={{ background: 'radial-gradient(circle, rgba(139,58,173,0.12), transparent 70%)', filter: 'blur(80px)' }} />

          <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-7 pb-8 md:pb-10">
            {/* Header de sección */}
            <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">SocialPro News</p>
                <h1 className="font-display text-3xl md:text-5xl font-black uppercase text-white tracking-tight leading-[0.95]">
                  Esports y CS2,<br className="hidden md:block" />
                  <span className="bg-sp-grad bg-clip-text text-transparent">contado por dentro</span>
                </h1>
              </div>
              <Link href="/blog" className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white/75 transition-colors whitespace-nowrap">
                ¿Caso de éxito? Ver Blog →
              </Link>
            </div>

            {/* Grid 3 columnas: hero | secundarias | sidebar (sidebar hidden on mobile) */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)_260px] gap-5 lg:items-stretch">
              {/* Col 1 — Hero principal */}
              <NewsHeroCard post={hero} />

              {/* Col 2 — Secundarias apiladas, llenan la altura del hero */}
              <div className="flex flex-col gap-4 h-full">
                {trending[0] && <NewsSecondaryCard post={trending[0]} />}
                {trending[1] && <NewsSecondaryCard post={trending[1]} />}
                {!trending[0] && (
                  <div className="flex-1 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center min-h-[160px]">
                    <p className="text-xs text-white/20">Asigna noticias secundarias en Slots editoriales</p>
                  </div>
                )}
              </div>

              {/* Col 3 — Sidebar: solo desktop */}
              <div className="hidden lg:block">
                <NewsHubSidebar latestPosts={sortedPosts} featuredMatch={featuredMatch} />
              </div>
            </div>
          </div>
        </section>

        {/* Últimas noticias — warm paper */}
        <section className="bg-[#F5F3F0] text-sp-black py-12 md:py-16 border-b border-black/[0.05]">
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 md:mb-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">
                  Cobertura editorial
                </p>
                <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-sp-black">
                  Últimas noticias
                </h2>
              </div>
              <NewsFilters tone="paper" />
            </div>
            <NewsGrid posts={grid} activeCategory={activeCategory} tone="paper" />
          </div>
        </section>

        {/* CTAs mobile — Sorteos y Códigos, solo visible en mobile después del grid */}
        <div className="lg:hidden bg-sp-black border-t border-white/[0.06] px-5 py-8 grid grid-cols-1 gap-4">
          <SorteosCtaCard tone="dark" />
          <CodigosCtaCard />
        </div>

        {/* Entrevista + Clip + Agenda */}
        <NewsHubBottomBlocks interview={featuredInterview} clip={featuredClip} agenda={agenda} />

        <NewsCrossBlogLink />
      </main>
    </>
  );
}
