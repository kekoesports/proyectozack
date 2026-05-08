import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostSlugs, getPostBySlug, getRelatedPosts } from '@/lib/queries/posts';
import { BlogCard } from '@/features/blog/components/BlogCard';
import { deriveCategory, readTime } from '@/lib/utils/blog';
import { SectionTag } from '@/components/ui/SectionTag';
import { TalentMiniCard } from '@/features/blog/components/TalentMiniCard';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { absoluteUrl } from '@/lib/site-url';
import { truncateMetaDescription, truncateMetaTitle } from '@/lib/utils/text';

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

/** Render a single body paragraph — handles ## h2, ### h3, **bold**, bullet lists */
function renderParagraph(text: string, key: number) {
  if (text.startsWith('## ')) {
    return (
      <h2 key={key} className="font-display text-2xl md:text-3xl font-black uppercase text-sp-dark mt-12 mb-3 pb-2 border-b border-sp-border">
        {text.slice(3)}
      </h2>
    );
  }
  if (text.startsWith('### ')) {
    return (
      <h3 key={key} className="font-display text-xl font-black uppercase text-sp-dark mt-8 mb-2">
        {text.slice(4)}
      </h3>
    );
  }
  // Bullet list block
  if (text.includes('\n- ') || text.startsWith('- ')) {
    const items = text.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2));
    return (
      <ul key={key} className="space-y-2 my-4 pl-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sp-muted text-base leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sp-orange flex-shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p key={key} className="text-base text-sp-muted leading-relaxed"
       dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
  );
}

/** Escape HTML entities to prevent XSS before injecting into the DOM */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Convert **bold** and *italic* inline markdown to HTML (input is pre-escaped) */
function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-sp-dark">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
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

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Blog', url: absoluteUrl('/blog') },
    { name: post.title, url: absoluteUrl(`/blog/${slug}`) },
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': absoluteUrl(`/blog/${slug}`),
    headline: post.title,
    description: post.excerpt,
    url: absoluteUrl(`/blog/${slug}`),
    inLanguage: 'es',
    author: {
      '@type': 'Person',
      name: post.author,
      worksFor: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro' },
    },
    publisher: {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: 'SocialPro',
      url: absoluteUrl('/'),
    },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    ...(post.coverUrl ? { image: post.coverUrl } : {}),
    ...(post.talentAvatars.length > 0
      ? {
          mentions: post.talentAvatars.map((t) => ({
            '@type': 'Person',
            name: t.name,
            url: absoluteUrl(`/talentos/${t.slug}`),
          })),
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* ── HERO ── */}
      <section className="bg-sp-black pt-28 pb-0">
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-10">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-8">
            <span aria-hidden="true">←</span> Volver al blog
          </Link>
          {/* Category + meta */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.12em] border ${category.bg} ${category.text} ${category.border}`}>
              {category.label}
            </span>
            <SectionTag>{post.author}</SectionTag>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight mt-3 mb-4">
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

        {/* Cover image */}
        {post.coverUrl && (
          <div className="relative w-full h-64 md:h-80 overflow-hidden">
            <Image src={post.coverUrl} alt={post.title} fill sizes="100vw" className="object-cover object-center" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-sp-black via-sp-black/20 to-transparent" />
          </div>
        )}
      </section>

      {/* ── BODY ── */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">

          {/* Excerpt / lead */}
          <p className="text-lg md:text-xl text-sp-dark font-medium leading-relaxed mb-10 pb-8 border-b border-sp-border">
            {post.excerpt}
          </p>

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
          <div className="space-y-5">
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

          {/* ── CTA ── */}
          <div className="mt-12 rounded-2xl bg-sp-black p-8 text-center">
            <p className="font-display text-xl font-black uppercase text-white mb-2">
              ¿Tu marca quiere resultados así?
            </p>
            <p className="text-sm text-white/50 mb-6">
              Gestionamos campañas con creadores gaming e iGaming en España y Latinoamérica.
            </p>
            <Link
              href="/#contacto"
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
