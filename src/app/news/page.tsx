import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { getNewsPosts } from '@/lib/queries/posts';
import { getEditorialSlots } from '@/lib/queries/editorialSlots';
import { isNewsCategorySlug, type NewsCategorySlug } from '@/lib/utils/news';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { NewsHero } from '@/features/news/components/NewsHero';
import { LiveBar } from '@/features/news/live-bar/LiveBar';
import { buildLiveBarItems } from '@/features/news/live-bar/buildLiveBarItems';
import { NewsFilters } from '@/features/news/components/NewsFilters';
import { NewsGrid } from '@/features/news/components/NewsGrid';
import { NewsHubSidebar } from '@/features/news/components/NewsHubSidebar';
import { NewsHubBottomBlocks } from '@/features/news/components/NewsHubBottomBlocks';
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

  const [allPosts, slots, liveBarItems] = await Promise.all([
    getNewsPosts(),
    getEditorialSlots(),
    buildLiveBarItems(),
  ]);

  // Resolver slots con fallback a posts más recientes
  const slotMap = Object.fromEntries(slots.map((s) => [s.slot, s.post]));
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

        {/* Hero + sidebar oscuro */}
        <section className="border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] gap-8">
              {/* Hero + secondary */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
                <NewsHero featured={hero} trending={trending} />
              </div>

              {/* Sidebar */}
              <NewsHubSidebar latestPosts={sortedPosts} />
            </div>
          </div>
        </section>

        {/* Últimas noticias — warm paper */}
        <section className="bg-[#F5F3F0] text-sp-black py-20 md:py-28 border-b border-black/[0.05]">
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-10 md:mb-14">
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

        {/* Entrevista + Clip + Agenda */}
        <NewsHubBottomBlocks interview={featuredInterview} clip={featuredClip} />

        <NewsCrossBlogLink />
      </main>
    </>
  );
}
