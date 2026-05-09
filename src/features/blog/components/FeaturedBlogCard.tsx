import Link from 'next/link';
import type { PostWithTalents } from '@/lib/queries/posts';
import { readTime, deriveCategory, formatBlogDate } from '@/lib/utils/blog';
import { BlogCover } from './BlogCover';

type Props = {
  readonly post: PostWithTalents;
};

/**
 * Card destacada del blog — split horizontal con imagen cinematográfica
 * a la izquierda y bloque editorial a la derecha.
 *
 * @kind server
 */
export function FeaturedBlogCard({ post }: Props) {
  const category  = deriveCategory(post.slug, post.title);
  const mins      = readTime(post.bodyMd);
  const dateLabel = formatBlogDate(post.publishedAt);

  // Color hex aproximado por categoría — para la línea acento del lado derecho
  const accentHex = category.text.includes('orange') ? '#f5632a'
    : category.text.includes('purple') || category.text.includes('400') && category.bg.includes('purple') ? '#a855f7'
    : category.text.includes('blue') ? '#5b9bd5'
    : category.text.includes('emerald') ? '#10b981'
    : category.text.includes('red') ? '#ef4444'
    : '#e03070';

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-2xl overflow-hidden border border-sp-border hover:border-sp-orange/35 hover:shadow-[0_16px_70px_-16px_rgba(245,99,42,0.28)] hover:-translate-y-0.5 transition-all duration-400 will-change-transform"
      aria-label={post.title}
    >
      <div className="grid grid-cols-1 md:grid-cols-[3fr_4fr]">

        {/* ── Imagen — cinematográfica ─────────────────────────────── */}
        <div className="relative overflow-hidden bg-sp-dark min-h-[200px] md:min-h-[260px]">
          <BlogCover
            coverUrl={post.coverUrl}
            category={category}
            title={post.title}
            variant="featured"
            priority
          />

          {/* Category pill */}
          <div className="absolute top-4 left-4 z-10">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.14em] border backdrop-blur-md ${category.bg} ${category.text} ${category.border}`}>
              <span className={`w-1 h-1 rounded-full ${category.text.replace('text-', 'bg-')}`} aria-hidden />
              Destacado
            </span>
          </div>
        </div>

        {/* ── Texto — editorial oscuro ─────────────────────────────── */}
        <div className="relative flex flex-col justify-center gap-4 p-6 sm:p-8 bg-sp-dark overflow-hidden">
          {/* Línea acento superior */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, transparent 0%, ${accentHex} 35%, ${accentHex} 65%, transparent 100%)` }}
          />

          {/* Glow ambiental */}
          <div
            className="absolute -right-24 -top-24 w-72 h-72 rounded-full blur-[80px] opacity-[0.07] pointer-events-none"
            style={{ background: accentHex }}
          />

          {/* Categoría + meta */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`inline-flex items-center gap-1 ${category.text} font-black uppercase tracking-[0.2em]`}>
              <span className={`w-1 h-1 rounded-full ${category.text.replace('text-', 'bg-')}`} aria-hidden />
              {category.label}
            </span>
            <span className="text-white/15" aria-hidden>·</span>
            <time dateTime={post.publishedAt?.toISOString()} className="text-white/30">{dateLabel}</time>
            {mins > 0 && (
              <>
                <span className="text-white/15" aria-hidden>·</span>
                <span className="text-white/30">{mins} min</span>
              </>
            )}
          </div>

          {/* Título */}
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white leading-[0.96] tracking-tight line-clamp-3 group-hover:text-sp-orange/90 transition-colors duration-300">
            {post.title}
          </h2>

          {/* Extracto */}
          <p className="text-sm text-white/55 line-clamp-2 leading-relaxed">
            {post.excerpt}
          </p>

          {/* CTA */}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-sp-orange group-hover:gap-2.5 transition-all duration-200">
            Leer artículo
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M2 5h6M5 2l3 3-3 3"/>
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
