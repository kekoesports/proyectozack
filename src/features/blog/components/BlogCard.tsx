import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { readTime, deriveCategory, formatBlogDate } from '@/lib/utils/blog';
import { gradientStyle } from '@/lib/utils/gradient';

type BlogCardProps = {
  post: PostWithTalents;
  secondary?: boolean; // primer card del grid — más grande, texto sobre imagen
};

export function BlogCard({ post, secondary = false }: BlogCardProps) {
  const category  = deriveCategory(post.slug, post.title);
  const mins      = readTime(post.bodyMd);
  const dateLabel = formatBlogDate(post.publishedAt);
  const avatars   = post.talentAvatars.slice(0, 3);

  // ── Variante secondary — imagen con overlay de texto (magazine) ─────
  if (secondary) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group relative block rounded-2xl overflow-hidden border border-white/[0.07] hover:border-sp-orange/30 hover:shadow-[0_0_40px_rgba(245,99,42,0.09)] transition-all duration-300"
        aria-label={post.title}
      >
        <div className="relative aspect-[4/3] lg:aspect-[16/11] w-full overflow-hidden bg-sp-dark">
          {post.coverUrl ? (
            <Image
              src={post.coverUrl}
              alt={post.title}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sp-dark to-sp-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.96] via-black/60 to-black/10" />

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-2.5">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.12em] border ${category.bg} ${category.text} ${category.border}`}>
                {category.label}
              </span>
              <span className="text-[10px] text-white/30">{dateLabel}</span>
              {mins > 0 && <><span className="text-white/15">·</span><span className="text-[10px] text-white/30">{mins} min</span></>}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-black uppercase text-white leading-tight mb-2 line-clamp-2 group-hover:text-sp-orange/90 transition-colors duration-200">
              {post.title}
            </h2>
            <p className="text-[12px] text-white/50 line-clamp-2 leading-relaxed">
              {post.excerpt}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  // ── Variante estándar — imagen arriba, texto abajo (dark card) ──────
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0d0d0f] hover:border-sp-orange/30 hover:shadow-[0_0_30px_rgba(245,99,42,0.08)] transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-sp-dark shrink-0">
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

        {/* Subtle overlay para mejor lectura de pills */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

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
                className="relative w-6 h-6 rounded-full border-2 border-white/50 overflow-hidden flex-shrink-0"
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
      <div className="flex flex-col flex-1 p-4">
        <h2 className="font-display text-base font-black uppercase text-white leading-tight mb-2 line-clamp-2 group-hover:text-sp-orange transition-colors duration-200">
          {post.title}
        </h2>
        <p className="text-[12px] text-white/45 leading-relaxed line-clamp-2 mb-3 flex-1">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-white/25 pt-3 border-t border-white/[0.07]">
          {dateLabel && <time dateTime={post.publishedAt?.toISOString()}>{dateLabel}</time>}
          <span aria-hidden>·</span>
          <span>{mins} min</span>
          <span className="ml-auto text-[10px] font-bold text-sp-orange/70 group-hover:text-sp-orange transition-colors">
            Leer →
          </span>
        </div>
      </div>
    </Link>
  );
}
