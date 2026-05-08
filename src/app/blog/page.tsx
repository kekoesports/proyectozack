import type { Metadata } from 'next';
import Link from 'next/link';
import { getPosts } from '@/lib/queries/posts';
import { BlogCard } from '@/features/blog/components/BlogCard';
import { FeaturedBlogCard } from '@/features/blog/components/FeaturedBlogCard';
import { absoluteUrl } from '@/lib/site-url';
import { deriveCategory, formatBlogDate } from '@/lib/utils/blog';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Insights & Tendencias Gaming — Blog SocialPro',
  description:
    'Estrategias de marketing gaming, análisis iGaming, casos de éxito y guías para marcas y creadores en España y LatAm. Publicado por la agencia SocialPro.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Insights & Tendencias Gaming | SocialPro Blog',
    description:
      'Casos de éxito, guías de marketing gaming e iGaming y tendencias del ecosistema creator en España y LatAm.',
    url: absoluteUrl('/blog'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insights & Tendencias Gaming | SocialPro Blog',
    description: 'Casos de éxito, guías gaming e iGaming y tendencias creator en España y LatAm.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const CATEGORY_LABELS = [
  'Todos', 'Casos de éxito', 'Guías', 'iGaming', 'Tendencias', 'YouTube',
] as const;

export default async function BlogPage() {
  const posts = await getPosts();

  const sorted   = [...posts].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
  const featured = sorted[0] ?? null;
  const rest     = sorted.slice(1);

  return (
    <>
      {/* ── HERO compacto — split desktop ──────────────────────────── */}
      <section className="bg-sp-black pt-20 pb-6 border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_264px] gap-8 items-start">

            {/* Izquierda: cabecera editorial */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-sp-orange mb-3">
                SocialPro · Blog
              </p>
              <h1 className="font-display text-[2.6rem] sm:text-5xl font-black uppercase text-white leading-[0.9] tracking-tight mb-3">
                Insights &<br />
                <span className="gradient-text">Tendencias</span>
              </h1>
              <p className="text-sm text-white/40 mb-5 leading-relaxed max-w-sm">
                Marketing gaming, iGaming y ecosistema creator en el mercado hispano.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_LABELS.map((cat, i) => (
                  <span
                    key={cat}
                    className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] border cursor-default transition-colors ${
                      i === 0
                        ? 'bg-sp-orange/15 border-sp-orange/40 text-sp-orange'
                        : 'bg-white/[0.03] border-white/[0.07] text-white/30 hover:border-white/15 hover:text-white/50'
                    }`}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Derecha: stack compacto de últimos artículos (desktop) */}
            {posts.length > 0 && (
              <div className="hidden lg:block border-l border-white/[0.06] pl-8">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3">
                  Últimas publicaciones
                </p>
                <div>
                  {posts.slice(0, 4).map((post) => {
                    const cat = deriveCategory(post.slug, post.title);
                    return (
                      <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        className="group flex items-start gap-2.5 py-2.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors -mx-2 px-2 rounded"
                      >
                        <span className={`shrink-0 mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.08em] border ${cat.bg} ${cat.text} ${cat.border}`}>
                          {cat.label.split(' ')[0]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-white/85 leading-tight line-clamp-2 group-hover:text-sp-orange transition-colors duration-150">
                            {post.title}
                          </p>
                          {post.publishedAt && (
                            <time className="text-[10px] text-white/25 mt-0.5 block">
                              {formatBlogDate(post.publishedAt)}
                            </time>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CONTENIDO — fondo claro ─────────────────────────────────── */}
      <section className="bg-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">

          {posts.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-2xl font-black uppercase text-sp-muted">
                Próximamente nuevos artículos.
              </p>
            </div>
          ) : (
            <>
              {/* Featured horizontal — imagen izquierda, texto derecha */}
              {featured != null && <FeaturedBlogCard post={featured} />}

              {/* Grid editorial */}
              {rest.length > 0 && (
                <>
                  {/* Fila 1: secondary (2-col) + standard (1-col) */}
                  {rest[0] && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2">
                        <BlogCard post={rest[0]} secondary />
                      </div>
                      {rest[1] && <BlogCard post={rest[1]} />}
                    </div>
                  )}

                  {/* Fila 2+: grid 3 columnas */}
                  {rest.length > 2 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {rest.slice(2).map((post) => (
                        <BlogCard key={post.id} post={post} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
