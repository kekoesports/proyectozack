import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate, readingMinutes } from '@/lib/utils/news';
import { derivePostRegionBadge } from '@/lib/utils/news-roles';

/**
 * Card protagonista — imagen ARRIBA (landscape), texto ABAJO en bloque.
 * Estructura editorial: no overlay, imagen y texto en zonas separadas.
 */
export function NewsHeroCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const reading = readingMinutes(post.bodyMd);

  return (
    <article className="relative group rounded-2xl overflow-hidden bg-[#0c1016] border border-white/[0.07] flex flex-col h-full hover:border-white/[0.14] transition-colors">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>

      {/* Imagen — landscape, zona superior */}
      <div className="relative aspect-[16/10] overflow-hidden shrink-0">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt=""
            fill
            priority
            sizes="(min-width:1024px) 55vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
        )}
        {/* Badge categoría sobre la imagen */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-[0.22em] rounded-full px-2.5 py-1 border backdrop-blur-sm ${cat.bg} ${cat.text} ${cat.border}`}>
            {cat.label}
          </span>
        </div>
      </div>

      {/* Texto — zona inferior, bloque oscuro */}
      <div className="flex flex-col flex-1 p-5 md:p-6">
        <h2
          className="font-display font-black uppercase tracking-tight leading-[0.92] mb-3 flex-1"
          style={{
            fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)',
            background: 'linear-gradient(135deg, #f5632a 0%, #e03070 55%, #c42880 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {post.title}
        </h2>
        <p className="text-[13px] text-white/55 leading-snug mb-4 line-clamp-2">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-white/35 mt-auto">
          <span className="font-semibold text-white/50 uppercase tracking-wider">{post.author}</span>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
          <time dateTime={post.publishedAt?.toISOString() ?? ''} className="tabular-nums">{date}</time>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
          <span>{reading} min</span>
        </div>
      </div>
    </article>
  );
}

/**
 * Card secundaria — imagen ARRIBA (landscape), texto ABAJO en bloque.
 * Más compacta que el hero, misma estructura editorial.
 */
export function NewsSecondaryCard({ post, index = 0 }: { readonly post: PostWithTalents; readonly index?: number }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const region = derivePostRegionBadge(post.talentAvatars.map((t) => t.country));

  return (
    <article className="relative group rounded-xl overflow-hidden bg-[#0c1016] border border-white/[0.07] flex flex-col flex-1 hover:border-white/[0.14] transition-colors min-h-[0]">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>

      {/* Imagen landscape */}
      <div className={`relative overflow-hidden shrink-0 ${index === 0 ? 'aspect-[16/9]' : 'aspect-[16/8]'}`}>
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt=""
            fill
            sizes="(min-width:1024px) 22vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
        )}
        {/* Badge sobre imagen */}
        <div className="absolute top-2 left-2 z-10">
          <span className={`inline-flex items-center text-[8px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border backdrop-blur-sm ${cat.bg} ${cat.text} ${cat.border}`}>
            {cat.label}
          </span>
        </div>
      </div>

      {/* Texto */}
      <div className="flex flex-col flex-1 px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          {region ? (
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">{region}</span>
          ) : null}
        </div>
        <h3 className="font-display font-black uppercase text-white tracking-tight leading-[1.05] line-clamp-2 text-[15px] md:text-base flex-1">
          {post.title}
        </h3>
        <time dateTime={post.publishedAt?.toISOString() ?? ''} className="text-[9px] text-white/30 tabular-nums uppercase tracking-wider mt-2">
          {date}
        </time>
      </div>
    </article>
  );
}
