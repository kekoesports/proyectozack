import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { readTime, deriveCategory, formatBlogDate } from '@/lib/utils/blog';
import { CategoryThumbnail } from './CategoryThumbnail';

type BlogCardProps = {
  post: PostWithTalents;
};

/**
 * Card editorial gaming — texto siempre sobre imagen (overlay).
 * Funciona con coverUrl real O con CategoryThumbnail (dark, no placeholder blanco).
 * Una única variante: consistencia visual en todo el grid.
 */
export function BlogCard({ post }: BlogCardProps) {
  const category  = deriveCategory(post.slug, post.title);
  const mins      = readTime(post.bodyMd);
  const dateLabel = formatBlogDate(post.publishedAt);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative block rounded-xl overflow-hidden border border-white/[0.08] hover:border-sp-orange/35 hover:shadow-[0_4px_32px_rgba(245,99,42,0.12)] transition-all duration-300"
      aria-label={post.title}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sp-dark">
        {/* Imagen o fallback editorial (nunca fondo blanco vacío) */}
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <CategoryThumbnail category={category} title={post.title} />
        )}

        {/* Overlay cinemático: texto siempre legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/[0.93] via-black/45 to-black/10" />

        {/* Category pill */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.12em] border backdrop-blur-sm ${category.bg} ${category.text} ${category.border}`}>
            {category.label}
          </span>
        </div>

        {/* Contenido superpuesto */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="font-display text-sm sm:text-base font-black uppercase text-white leading-tight mb-2 line-clamp-2 group-hover:text-sp-orange/90 transition-colors duration-200">
            {post.title}
          </h2>
          <div className="flex items-center gap-1.5 text-[9px] text-white/35">
            {dateLabel && <time dateTime={post.publishedAt?.toISOString()}>{dateLabel}</time>}
            {mins > 0 && <><span>·</span><span>{mins} min</span></>}
            <span className="ml-auto text-[9px] font-bold text-sp-orange/70 group-hover:text-sp-orange transition-colors">
              Leer →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
