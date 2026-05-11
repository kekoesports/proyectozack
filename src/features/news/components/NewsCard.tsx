import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate, readingMinutes } from '@/lib/utils/news';
import { derivePostRegionBadge } from '@/lib/utils/news-roles';

type Density = 'normal' | 'compact';
type Tone = 'dark' | 'paper';

type Props = {
  readonly post: PostWithTalents;
  readonly density?: Density;
  readonly tone?: Tone;
};

export function NewsCard({ post, density = 'normal', tone = 'dark' }: Props) {
  const category = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const reading = readingMinutes(post.bodyMd);
  const region = derivePostRegionBadge(post.talentAvatars.map((t) => t.country));
  const compact = density === 'compact';
  const surface =
    tone === 'paper'
      ? 'bg-sp-black border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5'
      : 'bg-[#0c1016] border border-white/[0.06] hover:border-white/15 hover:bg-[#10151d]';

  return (
    <article
      className={`group relative ${surface} rounded-2xl overflow-hidden transition-all duration-300 ${compact ? '' : 'flex flex-col'}`}
    >
      <Link
        href={`/news/${post.slug}`}
        className="absolute inset-0 z-10"
        aria-label={post.title}
      >
        <span className="sr-only">{post.title}</span>
      </Link>

      <div className={`relative w-full overflow-hidden bg-sp-black ${compact ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt=""
            fill
            sizes={compact ? '(min-width:1024px) 280px, 100vw' : '(min-width:1024px) 420px, 100vw'}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sp-black via-sp-dark to-sp-black flex items-center justify-center">
            <span className="font-display text-2xl font-black uppercase tracking-tight bg-sp-grad bg-clip-text text-transparent">
              SocialPro News
            </span>
          </div>
        )}
        <span className={`absolute top-3 left-3 inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${category.bg} ${category.text} ${category.border} backdrop-blur`}>
          {category.label}
        </span>
        {region ? (
          <span className="absolute top-3 right-3 inline-flex items-center text-[10px] font-bold uppercase tracking-[0.18em] rounded-full px-2.5 py-1 border border-white/15 bg-black/40 text-white/75 backdrop-blur">
            {region}
          </span>
        ) : null}
      </div>

      <div className={`relative ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
        <h3
          className={`font-display font-black uppercase text-white tracking-tight leading-[1.05] mb-2 group-hover:text-white/95 ${compact ? 'text-base' : 'text-lg md:text-xl'}`}
        >
          {post.title}
        </h3>
        {!compact ? (
          <p className="text-sm text-white/55 leading-relaxed mb-4 line-clamp-2">
            {post.excerpt}
          </p>
        ) : null}
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className="uppercase tracking-wider truncate">{post.author}</span>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
          <time dateTime={post.publishedAt?.toISOString() ?? ''} className="tabular-nums">
            {date}
          </time>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
          <span>{reading} min</span>
        </div>
      </div>
    </article>
  );
}
