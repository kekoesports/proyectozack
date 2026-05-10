import type { Metadata } from 'next';
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

export const revalidate = 1800;

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
  const [related, ecosystem] = await Promise.all([
    getRelatedNewsPosts(slug, 3),
    getPostEcosystem(post),
  ]);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': absoluteUrl(`/news/${slug}#article`),
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: {
      '@type': 'Person',
      name: post.author,
    },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <main className="bg-sp-black text-white">
        <article>
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

            <div className="relative max-w-3xl mx-auto px-5 md:px-8">
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

              <h1 className="font-display text-3xl md:text-5xl font-black uppercase text-white tracking-tight leading-[0.98] mb-5">
                {post.title}
              </h1>

              <p className="text-base md:text-lg text-white/65 leading-relaxed mb-6 max-w-2xl">
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
          </header>

          {post.coverUrl ? (
            <div className="relative max-w-5xl mx-auto px-5 md:px-8 -mt-2">
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-white/[0.06] bg-sp-black">
                <Image
                  src={post.coverUrl}
                  alt=""
                  fill
                  priority
                  sizes="(min-width:1024px) 960px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          ) : null}

          <section className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
            <NewsArticleBody bodyMd={post.bodyMd} />
          </section>

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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
