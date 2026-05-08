import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { readTime, deriveCategory, formatBlogDate } from '@/lib/utils/blog';
import { CategoryThumbnail } from './CategoryThumbnail';

type Props = {
  readonly post: PostWithTalents;
};

export function FeaturedBlogCard({ post }: Props) {
  const category  = deriveCategory(post.slug, post.title);
  const mins      = readTime(post.bodyMd);
  const dateLabel = formatBlogDate(post.publishedAt);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-2xl overflow-hidden border border-sp-border hover:border-sp-orange/40 hover:shadow-[0_4px_60px_-8px_rgba(245,99,42,0.22)] transition-all duration-400"
      aria-label={post.title}
    >
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr]">

        {/* ── Imagen izquierda — cinematográfica ─────────────────────── */}
        <div className="relative overflow-hidden bg-sp-dark min-h-[220px] md:min-h-[280px]">
          {post.coverUrl ? (
            <Image
              src={post.coverUrl}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <CategoryThumbnail category={category} title={post.title} />
          )}
          {/* Overlay multicapa cinematográfico */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30" />

          {/* Category pill */}
          <div className="absolute top-4 left-4">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.12em] border backdrop-blur-sm ${category.bg} ${category.text} ${category.border}`}>
              {category.label}
            </span>
          </div>
        </div>

        {/* ── Texto derecha — editorial oscuro ───────────────────────── */}
        <div className="relative flex flex-col justify-center gap-4 p-6 sm:p-8 bg-sp-dark overflow-hidden">
          {/* Línea acento superior — identidad de categoría */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${category.text.includes('orange') ? '#f5632a' : category.text.includes('purple') ? '#8b3aad' : category.text.includes('blue') ? '#5b9bd5' : category.text.includes('emerald') ? '#10b981' : category.text.includes('red') ? '#ef4444' : '#e03070'} 40%, transparent 100%)`,
            }}
          />

          {/* Glow ambiental suave */}
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[80px] opacity-[0.06] bg-sp-orange pointer-events-none" />

          {/* Meta */}
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            <time dateTime={post.publishedAt?.toISOString()}>{dateLabel}</time>
            {mins > 0 && <><span>·</span><span>{mins} min lectura</span></>}
          </div>

          {/* Título */}
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white leading-[0.95] tracking-tight line-clamp-3 group-hover:text-sp-orange/90 transition-colors duration-300">
            {post.title}
          </h2>

          {/* Extracto */}
          <p className="text-sm text-white/60 line-clamp-3 leading-relaxed">
            {post.excerpt}
          </p>

          {/* CTA */}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-sp-orange group-hover:text-white transition-colors duration-200">
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
