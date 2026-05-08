import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { readTime, deriveCategory, formatBlogDate } from '@/lib/utils/blog';
import { gradientStyle } from '@/lib/utils/gradient';

type BlogCardProps = {
  post: PostWithTalents;
};

export function BlogCard({ post }: BlogCardProps) {
  const category  = deriveCategory(post.slug, post.title);
  const mins      = readTime(post.bodyMd);
  const dateLabel = formatBlogDate(post.publishedAt);
  const avatars   = post.talentAvatars.slice(0, 3);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden border border-sp-border bg-white hover:border-sp-orange/30 hover:shadow-[0_8px_32px_rgba(245,99,42,0.07)] transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-sp-off shrink-0">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sp-dark to-sp-black" />
        )}

        {/* Category pill */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.12em] border backdrop-blur-sm ${category.bg} ${category.text} ${category.border}`}>
            {category.label}
          </span>
        </div>

        {/* Talent avatars */}
        {avatars.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center">
            {avatars.map((t, i) => (
              <div
                key={t.slug}
                className="relative w-6 h-6 rounded-full border-2 border-white/70 overflow-hidden flex-shrink-0"
                style={{ marginLeft: i === 0 ? 0 : -6, zIndex: avatars.length - i, background: gradientStyle(t.gradientC1, t.gradientC2) }}
              >
                {t.photoUrl ? (
                  <Image src={t.photoUrl} alt={t.name} fill sizes="24px" className="object-cover object-top" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white">
                    {t.initials}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <h2 className="font-display text-lg font-black uppercase text-sp-dark leading-tight mb-2.5 line-clamp-2 group-hover:text-sp-orange transition-colors duration-200">
          {post.title}
        </h2>
        <p className="text-sm text-sp-muted leading-relaxed line-clamp-2 mb-4 flex-1">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-sp-muted/60 pt-3 border-t border-sp-border">
          {dateLabel && (
            <time dateTime={post.publishedAt?.toISOString()}>{dateLabel}</time>
          )}
          <span aria-hidden>·</span>
          <span>{mins} min</span>
          <span className="ml-auto text-[11px] font-bold text-sp-orange group-hover:underline">
            Leer →
          </span>
        </div>
      </div>
    </Link>
  );
}
