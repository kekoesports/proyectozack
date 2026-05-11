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

/**
 * NewsCard editorial compacta — densidad magazine premium (Dexerto/HLTV).
 *
 * Sin stretching ni mt-auto. Cards de altura natural pero uniforme:
 *   - Cover aspect-[16/9] fijo (~57% del card en 3-col)
 *   - Body p-4 con min-h fijo en title/excerpt → 2 líneas siempre,
 *     content-driven height idéntico entre cards
 *   - Footer single-line pegado al excerpt (sin mt-auto)
 *
 * Grid usa `items-start` + wrappers sin flex → cards sit at natural height,
 * sin empty space al fondo.
 */
export function NewsCard({ post, density = 'normal', tone = 'dark' }: Props) {
  const category = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const reading = readingMinutes(post.bodyMd);
  const region = derivePostRegionBadge(post.talentAvatars.map((t) => t.country));
  const compact = density === 'compact';
  const surface =
    tone === 'paper'
      ? 'bg-sp-black border-black/[0.06] hover:border-black/15 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.14)]'
      : 'bg-[#0c1016] border-white/[0.06] hover:border-white/[0.18] hover:bg-[#11161f] hover:shadow-[0_14px_40px_rgba(0,0,0,0.5)]';

  return (
    <article
      className={`group relative w-full flex flex-col border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${surface}`}
    >
      <Link
        href={`/news/${post.slug}`}
        className="absolute inset-0 z-10"
        aria-label={post.title}
      >
        <span className="sr-only">{post.title}</span>
      </Link>

      <div className="relative aspect-[16/9] bg-sp-black overflow-hidden flex-none">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt=""
            fill
            sizes={compact ? '(min-width:1024px) 280px, 100vw' : '(min-width:1024px) 420px, 100vw'}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sp-black via-sp-dark to-sp-black flex items-center justify-center">
            <span className="font-display text-2xl font-black uppercase tracking-tight bg-sp-grad bg-clip-text text-transparent">
              SocialPro News
            </span>
          </div>
        )}
        <span
          className={`absolute top-3 left-3 inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${category.bg} ${category.text} ${category.border} backdrop-blur`}
        >
          {category.label}
        </span>
        {region ? (
          <span className="absolute top-3 right-3 inline-flex items-center text-[10px] font-bold uppercase tracking-[0.18em] rounded-full px-2.5 py-1 border border-white/15 bg-black/40 text-white/75 backdrop-blur">
            {region}
          </span>
        ) : null}
      </div>

      <div className={`relative ${compact ? 'p-3.5' : 'p-4'}`}>
        <h3
          className={`font-display font-black uppercase text-white tracking-tight leading-tight line-clamp-2 group-hover:text-white/95 mb-2 ${
            compact ? 'text-sm min-h-[36px]' : 'text-base min-h-[40px]'
          }`}
        >
          {post.title}
        </h3>
        {!compact ? (
          <p className="text-[12px] text-white/55 leading-snug line-clamp-2 min-h-[32px] mb-3">
            {post.excerpt}
          </p>
        ) : null}
        <div className="flex items-center gap-1.5 text-[10px] text-white/45 min-w-0">
          <span className="uppercase tracking-wider truncate">{post.author}</span>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20 shrink-0" />
          <time
            dateTime={post.publishedAt?.toISOString() ?? ''}
            className="tabular-nums shrink-0"
          >
            {date}
          </time>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20 shrink-0" />
          <span className="shrink-0">{reading} min</span>
        </div>
      </div>
    </article>
  );
}
