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
  // rest: artículos que NO son el featured — para hero derecho y grid
  const rest     = sorted.slice(1);

  return (
    <>
      {/* ── HERO compacto — split ───────────────────────────────────── */}
      <section className="relative bg-sp-black pt-8 pb-0 border-b border-white/[0.05] overflow-hidden">

        {/* Microdetalles visuales premium — no tocar sin motivo */}

        {/* Glow naranja/rosa detrás del contenido izquierdo */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[520px] h-[320px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(245,99,42,0.07) 0%, rgba(196,40,128,0.04) 50%, transparent 70%)', filter: 'blur(60px)' }}
        />

        {/* Dot grid muy suave — textura editorial */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            <pattern id="hero-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.7" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0 items-center">

            {/* Izquierda: cabecera editorial */}
            <div className="py-4 lg:pr-10 lg:border-r lg:border-white/[0.06]">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-sp-orange mb-2">
                SocialPro · Blog
              </p>
              <h1 className="font-display text-[2.2rem] sm:text-[2.6rem] font-black uppercase text-white leading-[0.88] tracking-tight mb-2">
                Insights &amp;<br />
                <span className="gradient-text">Tendencias</span>
              </h1>
              <p className="text-[13px] sm:text-sm text-white/55 mb-4 leading-relaxed max-w-sm">
                Marketing gaming, iGaming y ecosistema creator en España y LatAm.
                Casos reales, guías y análisis de la agencia SocialPro.
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

            {/* Derecha: últimas publicaciones — distintas al featured */}
            {rest.length > 0 && (
              <div className="hidden lg:flex flex-col pl-8 py-2 gap-0">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3">
                  Últimas publicaciones
                </p>
                {rest.slice(0, 5).map((post) => {
                  const cat = deriveCategory(post.slug, post.title);
                  return (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group flex items-start gap-2.5 py-2.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors -mx-2 px-2 rounded"
                    >
                      <span
                        className={`shrink-0 mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-[0.08em] border ${cat.bg} ${cat.text} ${cat.border}`}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {cat.label.split(' ')[0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white/80 leading-tight line-clamp-2 group-hover:text-sp-orange transition-colors duration-150">
                          {post.title}
                        </p>
                        {post.publishedAt && (
                          <time className="text-[9px] text-white/25 mt-0.5 block">
                            {formatBlogDate(post.publishedAt)}
                          </time>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CONTENIDO ───────────────────────────────────────────────── */}
      <section className="bg-white py-6 md:py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 md:space-y-8">

          {posts.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-2xl font-black uppercase text-sp-muted">
                Próximamente nuevos artículos.
              </p>
            </div>
          ) : (
            <>
              {/* Featured horizontal */}
              {featured != null && <FeaturedBlogCard post={featured} />}

              {/* Grid 3-col uniforme — mismo peso, sin secondary gigante */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
