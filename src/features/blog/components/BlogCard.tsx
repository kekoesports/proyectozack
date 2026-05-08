import Link from 'next/link';
import type { PostWithTalents } from '@/lib/queries/posts';
import { readTime, deriveCategory, formatBlogDate } from '@/lib/utils/blog';
import { BlogCover } from './BlogCover';

type BlogCardProps = {
  post: PostWithTalents;
};

/**
 * Card editorial unificada — texto sobre imagen, jerarquía limpia.
 *
 * Una única variante para todo el grid. La altura es ligeramente menor
 * que antes (3:2 en vez de 4:3) para densidad editorial mayor.
 *
 * @kind server
 */
export function BlogCard({ post }: BlogCardProps) {
  const category  = deriveCategory(post.slug, post.title);
  const mins      = readTime(post.bodyMd);
  const dateLabel = formatBlogDate(post.publishedAt);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative block rounded-xl overflow-hidden border border-white/[0.07] hover:border-sp-orange/40 hover:shadow-[0_8px_36px_-8px_rgba(245,99,42,0.18)] transition-all duration-300"
      aria-label={post.title}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-sp-dark">
        <BlogCover
          coverUrl={post.coverUrl}
          category={category}
          title={post.title}
          variant="card"
        />

        {/* Category pill — top-left, premium */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.14em] border backdrop-blur-md ${category.bg} ${category.text} ${category.border}`}>
            <span className={`w-1 h-1 rounded-full ${category.text.replace('text-', 'bg-')}`} aria-hidden />
            {category.label}
          </span>
        </div>

        {/* Contenido superpuesto — bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h2 className="font-display text-base sm:text-lg font-black uppercase text-white leading-[1.05] tracking-tight mb-2 line-clamp-2 group-hover:text-sp-orange/90 transition-colors duration-200">
            {post.title}
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
            {dateLabel && <time dateTime={post.publishedAt?.toISOString()}>{dateLabel}</time>}
            {mins > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>{mins} min</span>
              </>
            )}
            <span className="ml-auto text-[10px] font-black uppercase tracking-[0.1em] text-sp-orange/75 group-hover:text-sp-orange transition-colors flex items-center gap-1">
              Leer
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
