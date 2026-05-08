import type { Metadata } from 'next';
import { getPosts } from '@/lib/queries/posts';
import { BlogCard } from '@/features/blog/components/BlogCard';
import { FeaturedBlogCard } from '@/features/blog/components/FeaturedBlogCard';
import { absoluteUrl } from '@/lib/site-url';

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
  'Todos', 'Casos de éxito', 'Guías', 'iGaming', 'Tendencias', 'YouTube', 'Esports',
] as const;

export default async function BlogPage() {
  const posts = await getPosts();

  // Featured = post with highest sortOrder (admin can pin) or most recent
  const sorted  = [...posts].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
  const featured = sorted[0] ?? null;
  const rest     = sorted.slice(1);

  return (
    <>
      {/* ── HERO oscuro ────────────────────────────────────────────── */}
      <section className="bg-sp-black pt-28 pb-12 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Label */}
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-sp-orange mb-4">
            SocialPro · Blog
          </p>

          {/* H1 */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase text-white leading-[0.9] tracking-tight mb-4">
            Insights &<br />
            <span className="gradient-text">Tendencias</span>
          </h1>

          <p className="text-sm sm:text-base text-white/45 max-w-xl mb-8 leading-relaxed">
            Estrategias, casos reales y análisis sobre marketing gaming, esports e iGaming en el mercado hispano.
          </p>

          {/* Category pills — decorativas, sin filtro aún */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_LABELS.map((cat, i) => (
              <span
                key={cat}
                className={`inline-flex px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] border transition-colors ${
                  i === 0
                    ? 'bg-sp-orange/15 border-sp-orange/40 text-sp-orange'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/55 cursor-default'
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTENIDO ──────────────────────────────────────────────── */}
      <section className="bg-sp-black py-10 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">

          {posts.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-2xl font-black uppercase text-white/30">
                Próximamente nuevos artículos.
              </p>
            </div>
          ) : (
            <>
              {/* Featured article */}
              {featured != null && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-white/25 mb-3">
                    Artículo destacado
                  </p>
                  <FeaturedBlogCard post={featured} />
                </div>
              )}

              {/* Grid editorial — secondary card 2-col + resto */}
              {rest.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-white/25 mb-4">
                    Últimas publicaciones
                  </p>

                  {/* Fila 1: secondary (2-col) + tercero (1-col) */}
                  {rest.length >= 2 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                      <div className="lg:col-span-2">
                        <BlogCard post={rest[0]!} secondary />
                      </div>
                      <BlogCard post={rest[1]!} />
                    </div>
                  ) : (
                    <div className="mb-4">
                      <BlogCard post={rest[0]!} secondary />
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
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
