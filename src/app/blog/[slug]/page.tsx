import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostSlugs, getPostBySlug, getRelatedPosts } from '@/lib/queries/posts';
import { BlogCard } from '@/features/blog/components/BlogCard';
import { BlogCover } from '@/features/blog/components/BlogCover';
import { ExploraMas } from '@/features/blog/components/ExploraMas';
import { deriveCategory, readTime, detectBrand } from '@/lib/utils/blog';
import { renderParagraph } from '@/lib/utils/blog-renderer';
import { SectionTag } from '@/components/ui/SectionTag';
import { TalentMiniCard } from '@/features/blog/components/TalentMiniCard';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { absoluteUrl, schemaImageUrl } from '@/lib/site-url';
import { PostViewTracker } from '@/components/tracking/PostViewTracker';
import { truncateMetaDescription, truncateMetaTitle } from '@/lib/utils/text';
import { PodcastEmbedBlock } from '@/features/blog/components/PodcastEmbedBlock';
import type { PodcastBlock } from '@/features/blog/components/PodcastEmbedBlock';

export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const description = truncateMetaDescription(post.excerpt || undefined);
  const title = truncateMetaTitle(post.title);
  return {
    title, description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title, description,
      url: absoluteUrl(`/blog/${slug}`),
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      images: [{ url: absoluteUrl(`/api/og-image/blog?slug=${slug}`), width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [absoluteUrl(`/api/og-image/blog?slug=${slug}`)] },
  };
}

function extractPodcastBlock(blocksJson: unknown): PodcastBlock | null {
  if (!blocksJson || typeof blocksJson !== 'object') return null;
  const b = blocksJson as Record<string, unknown>;
  if (!b.podcast || typeof b.podcast !== 'object') return null;
  const p = b.podcast as Record<string, unknown>;
  if (typeof p.episodeTitle !== 'string' || typeof p.showName !== 'string') return null;
  // safe: validated field by field above
  return b.podcast as PodcastBlock;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, related] = await Promise.all([
    getPostBySlug(slug),
    getRelatedPosts(slug, 3),
  ]);
  if (!post || post.status !== 'published') notFound();

  const paragraphs = post.bodyMd.split('\n\n').filter(Boolean);
  const hasTalents = post.talentAvatars.length > 0;
  const category   = deriveCategory(post.slug, post.title);
  const mins       = readTime(post.bodyMd);
  const podcast    = extractPodcastBlock(post.blocksJson);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Blog', url: absoluteUrl('/blog') },
    { name: post.title, url: absoluteUrl(`/blog/${slug}`) },
  ]);

  const podcastEpisodeJsonLd = podcast ? {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    '@id': absoluteUrl(`/blog/${slug}#episode`),
    name: podcast.episodeTitle,
    url: podcast.audioUrl,
    datePublished: podcast.date,
    ...(podcast.duration ? { duration: podcast.duration } : {}),
    ...(podcast.description ? { description: podcast.description } : {}),
    partOfSeries: {
      '@type': 'PodcastSeries',
      name: podcast.showName,
      ...(podcast.showUrl ? { url: podcast.showUrl } : {}),
      publisher: { '@type': 'Organization', name: podcast.network },
    },
    mentions: [{ '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: absoluteUrl('/') }],
  } : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': absoluteUrl(`/blog/${slug}`),
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    url: absoluteUrl(`/blog/${slug}`),
    inLanguage: 'es',
    author: post.author && post.author !== 'SocialPro' && post.author !== 'Redacción'
      ? { '@type': 'Person', name: post.author, worksFor: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro' } }
      : { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro' },
    publisher: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: absoluteUrl('/') },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    ...(schemaImageUrl(post.coverUrl) ? { image: schemaImageUrl(post.coverUrl) } : {}),
    ...(post.talentAvatars.length > 0
      ? { mentions: post.talentAvatars.map((t) => ({ '@type': 'Person', name: t.name, url: absoluteUrl(`/talentos/${t.slug}`), jobTitle: t.role })) }
      : {}),
  };

  return (
    <>
      <PostViewTracker postId={post.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      {podcastEpisodeJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(podcastEpisodeJsonLd) }} />
      )}

      {/* ── HERO ── */}
      <section className="bg-sp-black pt-14 md:pt-20 pb-0">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-4 pb-7 md:pb-8">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-5">
            <span aria-hidden="true">←</span> Volver al blog
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.12em] border ${category.bg} ${category.text} ${category.border}`}>
              <span className={`w-1 h-1 rounded-full ${category.text.replace('text-', 'bg-')}`} aria-hidden />
              {category.label}
            </span>
            <SectionTag>{post.author}</SectionTag>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-[0.95] mt-2 mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-white/35">
            {post.publishedAt && (
              <time dateTime={post.publishedAt.toISOString()}>
                {new Date(post.publishedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            )}
            <span aria-hidden>·</span>
            <span>{mins} min lectura</span>
          </div>
        </div>

        {/* Cover — aspect ratio cinematic para mejor presencia visual */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '21/8' }}>
          <BlogCover
            coverUrl={post.coverUrl}
            category={category}
            slug={slug}
            title={post.title}
            variant="hero"
            priority
          />
        </div>
      </section>

      {/* ── BODY ── */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">

          {/* Excerpt / lead */}
          <p className="text-lg md:text-xl text-sp-dark font-medium leading-relaxed mb-10 pb-8 border-b border-sp-border">
            {post.excerpt}
          </p>

          {/* ── PODCAST EMBED ── */}
          {podcast && <PodcastEmbedBlock podcast={podcast} />}

          {/* ── TALENT CARDS ── */}
          {hasTalents && (
            <div className="mb-12 rounded-2xl border border-sp-border bg-sp-off p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-sp-orange mb-5">
                Creadores en esta campaña
              </p>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {post.talentAvatars.map((talent) => (
                  <TalentMiniCard key={talent.slug} talent={talent} />
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="space-y-6">
            {paragraphs.map((p, i) => renderParagraph(p, i))}
          </div>

          {/* ── RELATED POSTS ── */}
          {related.length > 0 && (
            <div className="mt-16 pt-12 border-t border-sp-border">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sp-muted mb-6">
                Sigue leyendo
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {related.map((p) => (
                  <BlogCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          )}

          {/* ── EXPLORA MÁS ── */}
          <ExploraMas
            brand={detectBrand(post.slug, post.title)}
            categorySlug={category.slug}
            talents={post.talentAvatars}
          />

          {/* ── CTA ── */}
          <div className="mt-10 rounded-2xl bg-sp-black p-8 text-center">
            <p className="font-display text-xl font-black uppercase text-white mb-2">
              ¿Tu marca quiere resultados así?
            </p>
            <p className="text-sm text-white/50 mb-6">
              Gestionamos campañas con creadores gaming e iGaming en España y Latinoamérica.
            </p>
            <Link
              href="/contacto?type=brand"
              className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Hablemos de tu campaña →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
