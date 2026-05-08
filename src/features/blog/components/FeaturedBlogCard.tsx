import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { readTime, deriveCategory, formatBlogDate } from '@/lib/utils/blog';

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
      className="group relative block rounded-2xl overflow-hidden border border-white/[0.06] hover:border-sp-orange/30 transition-colors duration-300"
      aria-label={post.title}
    >
      {/* Image — dominant, tall */}
      <div className="relative aspect-[21/9] sm:aspect-[3/1] w-full overflow-hidden bg-sp-dark">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sp-dark via-sp-black to-sp-black" />
        )}
        {/* Gradient overlay — text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />

        {/* Content inside image */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10">
          {/* Category + meta */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.12em] border ${category.bg} ${category.text} ${category.border}`}>
              {category.label}
            </span>
            <span className="text-[11px] text-white/35 font-medium">{dateLabel}</span>
            <span className="text-white/20">·</span>
            <span className="text-[11px] text-white/35 font-medium">{mins} min lectura</span>
          </div>

          {/* Title */}
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white leading-tight tracking-tight mb-3 line-clamp-2 group-hover:text-sp-orange/90 transition-colors duration-300">
            {post.title}
          </h2>

          {/* Excerpt */}
          <p className="text-sm sm:text-base text-white/60 line-clamp-2 mb-5 max-w-2xl leading-relaxed">
            {post.excerpt}
          </p>

          {/* CTA row */}
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sp-grad text-white text-[12px] font-black uppercase tracking-[0.1em] group-hover:opacity-90 transition-opacity">
              Leer artículo
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M2 6h8M6 2l4 4-4 4"/>
              </svg>
            </span>
            {post.author && post.author !== 'SocialPro' && (
              <span className="text-[11px] text-white/30">por {post.author}</span>
            )}
          </div>
        </div>
      </div>

      {/* Featured label */}
      <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
        <span className="w-1.5 h-1.5 rounded-full bg-sp-orange" />
        Destacado
      </div>
    </Link>
  );
}
