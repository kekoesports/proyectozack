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
      className="group relative block rounded-2xl overflow-hidden border border-white/[0.06] hover:border-sp-orange/25 transition-colors duration-300"
      aria-label={post.title}
    >
      <div className="relative aspect-[21/9] sm:aspect-[3/1] w-full overflow-hidden bg-sp-dark">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <CategoryThumbnail category={category} title={post.title} />
        )}

        {/* Overlay fuerte — texto siempre legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/[0.97] via-black/75 to-black/25" />

        {/* Contenido */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10">
          {/* Meta */}
          <div className="flex items-center gap-2.5 mb-3">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${category.bg} ${category.text} ${category.border}`}>
              {category.label}
            </span>
            <span className="text-[11px] text-white/30">{dateLabel}</span>
            {mins > 0 && <><span className="text-white/15">·</span><span className="text-[11px] text-white/30">{mins} min</span></>}
          </div>

          {/* Título */}
          <h2 className="font-display text-2xl sm:text-3xl lg:text-[2.5rem] font-black uppercase text-white leading-[0.95] tracking-tight mb-3 line-clamp-2 group-hover:text-sp-orange/90 transition-colors duration-300">
            {post.title}
          </h2>

          {/* Extracto */}
          <p className="text-sm text-white/55 line-clamp-2 mb-5 max-w-2xl leading-relaxed">
            {post.excerpt}
          </p>

          {/* CTA inline */}
          <span className="inline-flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.15em] text-sp-orange group-hover:text-white transition-colors duration-200">
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
