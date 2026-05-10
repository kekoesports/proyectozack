import type { Metadata } from 'next';
import { getNewsPosts } from '@/lib/queries/posts';
import { getCs2RosterForSidebar } from '@/lib/queries/live';
import { isNewsCategorySlug, type NewsCategorySlug } from '@/lib/utils/news';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { NewsHero } from '@/features/news/components/NewsHero';
import { LiveBar } from '@/features/news/live-bar/LiveBar';
import { buildLiveBarItems } from '@/features/news/live-bar/buildLiveBarItems';
import { NewsFilters } from '@/features/news/components/NewsFilters';
import { NewsGrid } from '@/features/news/components/NewsGrid';
import { NewsAside } from '@/features/news/components/NewsAside';
import { EditorialPickRail } from '@/features/news/components/EditorialPickRail';
import { NewsCrossBlogLink } from '@/features/news/components/NewsCrossBlogLink';

// LiveBar consume estado de live-status + posts recientes — bajamos
// revalidate de 1800 a 120 (2 min) para que la sensación de actividad
// sea fresca. Aún así dentro del cap de Function executions Hobby.
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

  const [allPosts, cs2Creators, liveBarItems] = await Promise.all([
    getNewsPosts(),
    getCs2RosterForSidebar(),
    buildLiveBarItems(),
  ]);

  const tagFiltered = activeTag
    ? allPosts.filter((p) => (p.tags ?? []).includes(activeTag))
    : allPosts;
  const sorted = [...tagFiltered].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
  const featured = sorted[0] ?? null;
  const trending = sorted.slice(1, 4);
  const grid = sorted.slice(4);
  const editor = sorted.slice(0, 5);
  // ItemList schema: top 10 posts más recientes (sin filtro), para que
  // Google entienda /news como hub editorial estructurado.
  const allSorted = [...allPosts].sort(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
  const jsonLd = buildJsonLd(
    allSorted.slice(0, 10).map((p) => ({ slug: p.slug, title: p.title })),
  );

  if (!featured) {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="bg-sp-black text-white">
        <LiveBar items={liveBarItems} />
        <NewsHero featured={featured} trending={trending} />

        <section className="bg-sp-black py-12 md:py-16 border-b border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 md:mb-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">
                  Cobertura editorial
                </p>
                <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight">
                  Últimas noticias
                </h2>
              </div>
              <NewsFilters />
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
              <NewsGrid posts={grid} activeCategory={activeCategory} />
              <NewsAside posts={editor} cs2Creators={cs2Creators} />
            </div>
          </div>
        </section>

        <EditorialPickRail />

        <NewsCrossBlogLink />
      </main>
    </>
  );
}
