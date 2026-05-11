import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate, readingMinutes } from '@/lib/utils/news';
import { derivePostRegionBadge } from '@/lib/utils/news-roles';

/**
 * Card protagonista del hub de noticias.
 * No incluye section/max-w — el padre controla el layout de columnas.
 */
export function NewsHeroCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const reading = readingMinutes(post.bodyMd);

  return (
    <article className="relative group bg-[#0c1016] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/15 transition-colors h-full min-h-[380px] lg:min-h-[480px]">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>

      {/* Imagen de fondo — cubre todo el card */}
      <div className="absolute inset-0">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt=""
            fill
            priority
            sizes="(min-width:1024px) 55vw, 100vw"
            className="object-cover saturate-[0.9] brightness-[0.8] transition-transform duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sp-black via-[#0d1420] to-sp-black" />
        )}
        {/* Gradient de texto — bottom 60% */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[65%] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(8,10,14,0.75) 35%, rgba(8,10,14,0.97) 80%, rgb(8,10,14) 100%)',
          }}
        />
      </div>

      {/* Contenido superpuesto */}
      <div className="relative h-full flex flex-col justify-end p-5 md:p-7">
        {/* Badge categoría — top left */}
        <div className="absolute top-4 left-4 z-10">
          <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1.5 border backdrop-blur ${cat.bg} ${cat.text} ${cat.border}`}>
            {cat.label}
          </span>
        </div>

        <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-black uppercase text-white tracking-tight leading-[1.0] mb-3">
          {post.title}
        </h2>
        <p className="text-sm text-white/65 leading-relaxed mb-4 line-clamp-2 max-w-2xl">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-white/45">
          <span className="uppercase tracking-wider">{post.author}</span>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/25" />
          <time dateTime={post.publishedAt?.toISOString() ?? ''} className="tabular-nums">{date}</time>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/25" />
          <span>{reading} min</span>
        </div>
      </div>
    </article>
  );
}

/**
 * Card secundaria (secondary_1 / secondary_2).
 * Misma idea que el hero pero más compacta. El padre apila dos en columna.
 */
export function NewsSecondaryCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const region = derivePostRegionBadge(post.talentAvatars.map((t) => t.country));

  return (
    <article className="relative group bg-[#0c1016] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/15 transition-colors flex-1 min-h-[180px]">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>

      {/* Imagen */}
      <div className="absolute inset-0">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt=""
            fill
            sizes="(min-width:1024px) 25vw, 100vw"
            className="object-cover saturate-[0.85] brightness-[0.75] transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
        )}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(8,10,14,0.2) 0%, rgba(8,10,14,0.92) 70%, rgb(8,10,14) 100%)' }}
        />
      </div>

      {/* Contenido */}
      <div className="relative h-full flex flex-col justify-end p-4 md:p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cat.accent}`} aria-hidden />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">{cat.label}</span>
          {region ? (
            <>
              <span aria-hidden className="text-white/15">·</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">{region}</span>
            </>
          ) : null}
        </div>
        <h3 className="font-display font-black uppercase text-white text-base md:text-lg lg:text-xl tracking-tight leading-[1.1] line-clamp-2 mb-2">
          {post.title}
        </h3>
        <time dateTime={post.publishedAt?.toISOString() ?? ''} className="text-[10px] text-white/40 tabular-nums uppercase tracking-wider">
          {date}
        </time>
      </div>
    </article>
  );
}
