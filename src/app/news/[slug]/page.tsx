import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getNewsSlugs, getPostBySlug, getRelatedNewsPosts } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate, readingMinutes } from '@/lib/utils/news';
import { absoluteUrl } from '@/lib/site-url';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { truncateMetaDescription, truncateMetaTitle } from '@/lib/utils/text';
import { NewsArticleBody } from '@/features/news/components/NewsArticleBody';
import { NewsCard } from '@/features/news/components/NewsCard';
import { EcosystemPanel } from '@/features/news/components/EcosystemPanel';
import { getPostEcosystem } from '@/lib/news/ecosystem';
import { Cs2LabCard } from '@/components/cs2-lab/Cs2LabCard';
import { getPostBlocks } from '@/features/news/posts';
import { MatchContextBlock } from '@/features/news/components/article-blocks/MatchContextBlock';
import { RosterBlock } from '@/features/news/components/article-blocks/RosterBlock';
import { EditorialQuoteBlock } from '@/features/news/components/article-blocks/EditorialQuoteBlock';
import { ArticleEmbedBlock } from '@/features/news/components/article-blocks/ArticleEmbedBlock';
import { InterleavedArticleBody } from '@/features/news/components/article-blocks/InterleavedArticleBody';

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getNewsSlugs();
  return slugs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.vertical !== 'news') return {};
  const description = truncateMetaDescription(post.excerpt || undefined);
  const title = truncateMetaTitle(post.title);
  const cover = post.coverUrl ? absoluteUrl(post.coverUrl) : absoluteUrl('/og-socialpro.png');
  return {
    title,
    description,
    alternates: { canonical: `/news/${slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/news/${slug}`),
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author],
      images: [{ url: cover, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [cover],
    },
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.vertical !== 'news') notFound();

  const category = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const reading = readingMinutes(post.bodyMd);
  const [blocks, related, ecosystem] = await Promise.all([
    getPostBlocks(slug),
    getRelatedNewsPosts(slug, 4),
    getPostEcosystem(post),
  ] as const);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': absoluteUrl(`/news/${slug}#article`),
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: post.author && post.author !== 'SocialPro' && post.author !== 'Redacción'
      ? { '@type': 'Person', name: post.author, worksFor: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro' } }
      : { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro' },
    publisher: { '@id': absoluteUrl('/#organization') },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/news/${slug}`) },
    articleSection: category.label,
    inLanguage: 'es',
    ...(post.coverUrl ? { image: absoluteUrl(post.coverUrl) } : {}),
  };

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'News', url: absoluteUrl('/news') },
    { name: post.title, url: absoluteUrl(`/news/${slug}`) },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }}
      />

      <main className="bg-sp-black text-white">
        <article>
          {/* ── Article header — 2-col on md+: left=text, right=image ── */}
          <header className="relative bg-sp-black border-b border-white/[0.06] pt-10 pb-10 md:pt-14 md:pb-12 overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full pointer-events-none opacity-60"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(245,99,42,0.10), rgba(196,40,128,0.05) 40%, transparent 70%)',
                filter: 'blur(70px)',
              }}
            />

            <div className="relative max-w-6xl mx-auto px-5 md:px-8">
              <div className={`grid gap-8 md:gap-12 items-center ${post.coverUrl ? 'md:grid-cols-[3fr_2fr]' : ''}`}>

                {/* Left — text */}
                <div>
                  <nav aria-label="Breadcrumb" className="mb-6 text-[11px] uppercase tracking-wider text-white/35 flex items-center gap-2">
                    <Link href="/news" className="hover:text-white/70 transition-colors">
                      News
                    </Link>
                    <span aria-hidden>/</span>
                    <span className={`font-bold ${category.text}`}>{category.label}</span>
                  </nav>

                  <span
                    className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border mb-5 ${category.bg} ${category.text} ${category.border}`}
                  >
                    {category.label}
                  </span>

                  <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-black uppercase text-white tracking-tight leading-[0.98] mb-5">
                    {post.title}
                  </h1>

                  <p className="text-base md:text-lg text-white/65 leading-relaxed mb-6">
                    {post.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-white/45">
                    <span className="uppercase tracking-wider text-white/65">{post.author}</span>
                    <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
                    {post.publishedAt ? (
                      <time dateTime={post.publishedAt.toISOString()} className="tabular-nums">
                        {date}
                      </time>
                    ) : null}
                    <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
                    <span>{reading} min de lectura</span>
                  </div>
                </div>

                {/* Right — cover image (only on desktop 2-col) */}
                {post.coverUrl ? (
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.03]">
                    <Image
                      src={post.coverUrl}
                      alt=""
                      fill
                      priority
                      sizes="(min-width:1024px) 40vw, 100vw"
                      className="object-cover object-top"
                    />
                  </div>
                ) : null}

              </div>
            </div>
          </header>

          {/* ── Article body — starts immediately after header ─────── */}
          {blocks?.layout && blocks.layout.length > 0 ? (
            <InterleavedArticleBody bodyMd={post.bodyMd} blocks={blocks} />
          ) : (
            <>
              {blocks?.matchContext ? <MatchContextBlock match={blocks.matchContext} /> : null}
              <section className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
                <NewsArticleBody bodyMd={post.bodyMd} />
              </section>
              {blocks?.quotes?.[0] ? <EditorialQuoteBlock quote={blocks.quotes[0]} /> : null}
              {blocks?.embeds?.[0] ? <ArticleEmbedBlock embed={blocks.embeds[0]} /> : null}
              {blocks?.roster ? <RosterBlock roster={blocks.roster} /> : null}
            </>
          )}

        </article>

        <EcosystemPanel slug={slug} ecosystem={ecosystem} />

        {ecosystem.channelTelegram === null ? (
          <section className="max-w-5xl mx-auto px-5 md:px-8 pb-12 md:pb-16">
            <Cs2LabCard variant="compact" ctaId={`news_article_${slug}_apuesta_segura`} />
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="bg-sp-black border-t border-white/[0.06] py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-5 md:px-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">
                Sigue leyendo
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight mb-8">
                Más en SocialPro News
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {related.map((p) => (
                  <NewsCard key={p.slug} post={p} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
