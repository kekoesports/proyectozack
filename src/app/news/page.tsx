import type { Metadata } from 'next';
import { getNewsPosts } from '@/lib/queries/posts';
import { getTalents } from '@/lib/queries/talents';
import { isNewsCategorySlug, type NewsCategorySlug } from '@/lib/utils/news';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { NewsHero } from '@/features/news/components/NewsHero';
import { NewsFilters } from '@/features/news/components/NewsFilters';
import { NewsGrid } from '@/features/news/components/NewsGrid';
import { NewsAside } from '@/features/news/components/NewsAside';
import { EditorialPickRail } from '@/features/news/components/EditorialPickRail';
import { NewsCrossBlogLink } from '@/features/news/components/NewsCrossBlogLink';

export const revalidate = 1800;

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

const jsonLd = {
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
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'SocialPro', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'News', item: absoluteUrl('/news') },
      ],
    },
  ],
} satisfies Record<string, unknown>;

type PageProps = {
  searchParams: Promise<{ cat?: string }>;
};

export default async function NewsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const requestedCat = sp.cat ?? '';
  const activeCategory: NewsCategorySlug | null = isNewsCategorySlug(requestedCat)
    ? requestedCat
    : null;

  const [allPosts, talents] = await Promise.all([
    getNewsPosts(),
    getTalents(),
  ]);

  const sorted = [...allPosts].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
  const featured = sorted[0] ?? null;
  const trending = sorted.slice(1, 4);
  const grid = sorted.slice(4);
  const editor = sorted.slice(0, 5);

  // Pick a CS2 talent as spotlight if any exists
  const cs2Talent = talents.find((t) =>
    /cs[: ]?2|counter[- ]?strike/i.test(t.game ?? '') ||
    t.tags.some((tag) => /cs[: ]?2|counter[- ]?strike/i.test(tag.tag)),
  );
  const spotlight = cs2Talent
    ? {
        slug: cs2Talent.slug,
        name: cs2Talent.name,
        role: cs2Talent.role,
        platform: cs2Talent.platform,
        photoUrl: cs2Talent.photoUrl,
        initials: cs2Talent.initials,
        gradientC1: cs2Talent.gradientC1,
        gradientC2: cs2Talent.gradientC2,
      }
    : null;

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
              <NewsAside posts={editor} creatorSpotlight={spotlight} />
            </div>
          </div>
        </section>

        <EditorialPickRail />

        <NewsCrossBlogLink />
      </main>
    </>
  );
}
