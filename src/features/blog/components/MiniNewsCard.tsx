import Link from 'next/link';
import type { PostWithTalents } from '@/lib/queries/posts';
import { readTime, deriveCategory, formatBlogDate } from '@/lib/utils/blog';

type Props = {
  readonly post: PostWithTalents;
};

export function MiniNewsCard({ post }: Props) {
  const category  = deriveCategory(post.slug, post.title);
  const mins      = readTime(post.bodyMd);
  const dateLabel = formatBlogDate(post.publishedAt);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col gap-2 p-3.5 rounded-xl border border-white/[0.07] bg-[#111116] hover:border-sp-orange/30 hover:bg-[#161620] transition-all duration-200 flex-1"
    >
      <span className={`inline-flex w-fit px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.1em] border ${category.bg} ${category.text} ${category.border}`}>
        {category.label}
      </span>
      <h3 className="font-display text-sm font-black uppercase text-white/90 leading-tight line-clamp-3 group-hover:text-sp-orange transition-colors duration-150 flex-1">
        {post.title}
      </h3>
      <div className="flex items-center gap-1.5 text-[9px] text-white/30">
        {dateLabel && <time dateTime={post.publishedAt?.toISOString()}>{dateLabel}</time>}
        <span>·</span>
        <span>{mins} min</span>
      </div>
    </Link>
  );
}
