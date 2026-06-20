import { NewsletterPopup } from '@/features/news/components/NewsletterPopup';
import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { getNewsPosts } from '@/lib/queries/posts';
import { getEditorialSlots } from '@/lib/queries/editorialSlots';
import { getUpcomingAgendaItems } from '@/lib/queries/agendaItems';
import { getTopRanking } from '@/lib/queries/rankingEntries';
import { getFeaturedMatch } from '@/lib/queries/matches';
import { db } from '@/lib/db';
import { posts } from '@/db/schema';
import { eq, and, isNotNull, desc, lte } from 'drizzle-orm';
import { isNewsCategorySlug, type NewsCategorySlug } from '@/lib/utils/news';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { NewsHeroCard, NewsSecondaryLarge, NewsSecondaryMedium, NewsCompactStrip } from '@/features/news/components/NewsHero';
import { LiveBar } from '@/features/news/live-bar/LiveBar';
import { buildLiveBarItems } from '@/features/news/live-bar/buildLiveBarItems';
import { NewsFilters } from '@/features/news/components/NewsFilters';
import { NewsGrid } from '@/features/news/components/NewsGrid';
import { NewsHubSidebar } from '@/features/news/components/NewsHubSidebar';
import { NewsHubEditorialZone } from '@/features/news/components/NewsHubEditorialZone';
import { NewsCrossBlogLink } from '@/features/news/components/NewsCrossBlogLink';
import { Cs2LabCard } from '@/components/cs2-lab/Cs2LabCard';

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

  const now = new Date();
  const [allPosts, slots, liveBarItems, agenda, ranking, featuredMatchRow, rawYoutubePosts] = await Promise.all([
    getNewsPosts().catch(() => []),
    getEditorialSlots().catch(() => []),
    buildLiveBarItems().catch(() => []),
    getUpcomingAgendaItems(5).catch(() => []),
    getTopRanking(5).catch(() => []),
    getFeaturedMatch().catch(() => null),
    db.select({
      id: posts.id, slug: posts.slug, title: posts.title, excerpt: posts.excerpt,
      coverUrl: posts.coverUrl, publishedAt: posts.publishedAt, blocksJson: posts.blocksJson,
    }).from(posts).where(and(eq(posts.status, 'published'), eq(posts.vertical, 'news'), isNotNull(posts.blocksJson), lte(posts.publishedAt, now))).orderBy(desc(posts.publishedAt)).limit(6).catch(() => []),
  ]);

  // Filtrar solo los que tienen embed YouTube
  type YoutubePost = { id: number; slug: string; title: string; excerpt: string; coverUrl: string | null; publishedAt: Date | null; youtubeUrl: string };
  const youtubePosts: YoutubePost[] = rawYoutubePosts.flatMap((p) => {
    const blocks = p.blocksJson as { embeds?: { platform: string; url: string }[] } | null;
    const ytEmbed = blocks?.embeds?.find((e) => e.platform === 'youtube');
    if (!ytEmbed) return [];
    return [{ id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, coverUrl: p.coverUrl ?? null, publishedAt: p.publishedAt ?? null, youtubeUrl: ytEmbed.url }];
  });

  // IDs de posts con embed YouTube — excluirlos de la portada editorial
  const youtubePostIds = new Set(youtubePosts.map((p) => p.id));

  // Resolver slots con fallback a posts más recientes
  const slotMap = Object.fromEntries(slots.map((s) => [s.slot, s.post]));
  // featuredMatch now comes from the matches table (getFeaturedMatch above)
  const featuredMatch = featuredMatchRow
    ? {
        team1:       featuredMatchRow.team1,
        team2:       featuredMatchRow.team2,
        team1Logo:   featuredMatchRow.team1Logo,
        team2Logo:   featuredMatchRow.team2Logo,
        tournament:  featuredMatchRow.tournament,
        matchDate:   featuredMatchRow.matchDate,
        matchTime:   featuredMatchRow.matchTime,
        matchStatus: (featuredMatchRow.matchStatus as import('@/features/news/components/FeaturedMatchCard').FeaturedMatchMeta['matchStatus']) ?? null,
        isActive:    featuredMatchRow.isActive,
      }
    : null;

  const sortedPosts = [...allPosts].sort(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );

  // Posts editoriales: excluir vídeos YouTube del hero/secondary/sidebar
  const editorialPosts = sortedPosts.filter((p) => !youtubePostIds.has(p.id));

  // Portada: usa editorialPosts (sin YouTube) para fallback
  const hero = slotMap['hero'] ?? editorialPosts[0] ?? null;
  const secondary1 = slotMap['secondary_1'] ?? editorialPosts.find((p) => p.slug !== hero?.slug) ?? null;
  const secondary2 =
    slotMap['secondary_2'] ??
    editorialPosts.find((p) => p.slug !== hero?.slug && p.slug !== secondary1?.slug) ??
    null;
  const featuredInterview = slotMap['featured_interview'] ?? null;
  const featuredClip = slotMap['featured_clip'] ?? null;

  const trending = [secondary1, secondary2].filter(Boolean) as typeof allPosts;

  // Grid: todos los posts con filtros aplicados
  const tagFiltered = activeTag
    ? allPosts.filter((p) => (p.tags ?? []).includes(activeTag))
    : allPosts;
  // Grid de últimas noticias: siempre publishedAt DESC — más reciente primero
  const grid = [...tagFiltered].sort(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );

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
        <h1 className="sr-only">SocialPro News — Esports, CS2 y comunidad gaming</h1>
        {/* LiveBar */}
        <LiveBar items={liveBarItems} />

        {/* Hero editorial — 3 columnas */}
        <section className="relative border-b border-white/[0.06] overflow-hidden">
          {/* Gradientes de ambiente al nivel de sección */}
          <div aria-hidden className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full pointer-events-none opacity-60" style={{ background: 'radial-gradient(circle, rgba(245,99,42,0.10), rgba(196,40,128,0.05) 50%, transparent 70%)', filter: 'blur(80px)' }} />
          <div aria-hidden className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full pointer-events-none opacity-40" style={{ background: 'radial-gradient(circle, rgba(139,58,173,0.12), transparent 70%)', filter: 'blur(80px)' }} />

          <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-4 pb-4">
            {/*
              Layout: flex row — editorial col izquierda (content-driven) + sidebar derecha.
              La sidebar NO está en el mismo grid que el hero para no imponer su altura al resto.
            */}
            <div className="flex flex-col lg:flex-row gap-3">

              {/* Columna editorial — altura determinada por su propio contenido */}
              <div className="flex-1 min-w-0 flex flex-col gap-3">

                {/* Hero + secondary en grid 2 cols */}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-3">
                  {/* Hero 440px */}
                  <NewsHeroCard post={hero} />

                  {/* Secondary col — misma altura que el hero */}
                  <div className="flex flex-col gap-3 md:h-[440px]">
                    <div className="min-h-[180px] md:flex-[5] md:min-h-0">
                      {trending[0]
                        ? <NewsSecondaryLarge post={trending[0]} />
                        : <div className="h-full rounded-xl bg-white/[0.03] border border-white/[0.05]" />}
                    </div>
                    <div className="min-h-[130px] md:flex-[3] md:min-h-0">
                      {trending[1]
                        ? <NewsSecondaryMedium post={trending[1]} />
                        : <div className="h-full rounded-xl bg-white/[0.03] border border-white/[0.05]" />}
                    </div>
                    {(() => {
                      const compact = featuredInterview ?? featuredClip ?? editorialPosts[2] ?? null;
                      const label = featuredInterview ? 'Entrevista' : featuredClip ? 'Clip' : undefined;
                      return compact ? (
                        <div className="min-h-[76px] md:flex-[2] md:min-h-0">
                          <NewsCompactStrip post={compact} label={label} />
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* CTA — sube inmediatamente después del grid, sin espacio extra */}
                <Cs2LabCard variant="compact" ctaId="news_hub_portada_apuesta_segura" />
              </div>

              {/* Sidebar — columna independiente, no afecta altura del editorial */}
              <div className="hidden lg:block w-[256px] shrink-0">
                <NewsHubSidebar featuredMatch={featuredMatch} ranking={ranking} />
              </div>
            </div>
          </div>
        </section>

        {/* Últimas noticias — warm paper */}
        <section className="bg-[#F5F3F0] text-sp-black py-8 md:py-12 border-b border-black/[0.05]">
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

        {/* Zona editorial — destacados, análisis, YouTube, comunidad */}
        <NewsHubEditorialZone
          interview={featuredInterview}
          clip={featuredClip}
          featuredMatch={featuredMatch}
          agenda={agenda}
          ranking={ranking}
          topPosts={editorialPosts}
          youtubePosts={youtubePosts}
        />

        <NewsCrossBlogLink />
      </main>

      <NewsletterPopup />
    </>
  );
}
