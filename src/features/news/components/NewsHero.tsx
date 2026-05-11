import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate, readingMinutes } from '@/lib/utils/news';

// ─── ALTURAS FIJAS ────────────────────────────────────────────────────────────
// Hero desktop:      560px
// Secondary large:   265px
// Secondary medium:  175px
// Compact strip:     100px
// Total col derecha: 265 + 16 + 175 + 16 + 100 = 572px ≈ hero
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hero editorial — imagen fondo completo, overlay gradient, texto bottom-left.
 * Estilo portal esports premium. Altura fija 560px desktop.
 */
export function NewsHeroCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const reading = readingMinutes(post.bodyMd);

  return (
    <article className="relative group rounded-2xl overflow-hidden h-[300px] md:h-[380px] lg:h-[440px] hover:ring-1 hover:ring-white/15 transition-all">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>
      {post.coverUrl ? (
        <Image src={post.coverUrl} alt="" fill priority sizes="(min-width:1024px) 58vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
      )}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.06) 0%,rgba(0,0,0,0.18) 25%,rgba(0,0,0,0.68) 60%,rgba(0,0,0,0.96) 100%)' }} />
      <div className="absolute top-4 left-4 z-10">
        <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-[0.22em] rounded-full px-2.5 py-1 border backdrop-blur-sm ${cat.bg} ${cat.text} ${cat.border}`}>
          {cat.label}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7 z-10">
        <h2 className="font-display font-black uppercase tracking-tight leading-[0.92] mb-3 line-clamp-2"
          style={{
            fontSize: 'clamp(1.55rem, 2.8vw, 2.5rem)',
            background: 'linear-gradient(135deg,#f5632a 0%,#e03070 55%,#c42880 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
          {post.title}
        </h2>
        <p className="text-[13px] text-white/60 leading-snug line-clamp-2 mb-4 max-w-2xl hidden md:block">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <span className="font-semibold text-white/55 uppercase tracking-wider">{post.author}</span>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/25" />
          <time dateTime={post.publishedAt?.toISOString() ?? ''}>{date}</time>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/25" />
          <span>{reading} min</span>
        </div>
      </div>
    </article>
  );
}

/**
 * Secondary card grande — ~265px desktop.
 */
export function NewsSecondaryLarge({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);

  return (
    <article className="relative group rounded-xl overflow-hidden h-full hover:ring-1 hover:ring-white/15 transition-all">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>
      {post.coverUrl ? (
        <Image src={post.coverUrl} alt="" fill sizes="(min-width:1024px) 28vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
      )}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.04) 0%,rgba(0,0,0,0.55) 55%,rgba(0,0,0,0.93) 100%)' }} />
      <div className="absolute top-3 left-3 z-10">
        <span className={`inline-flex items-center text-[8px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border backdrop-blur-sm ${cat.bg} ${cat.text} ${cat.border}`}>
          {cat.label}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <h3 className="font-display font-black uppercase text-white tracking-tight leading-[1.05] line-clamp-2 text-[15px] md:text-base">
          {post.title}
        </h3>
        <time className="text-[9px] text-white/35 uppercase tracking-wider mt-1 block">{date}</time>
      </div>
    </article>
  );
}

/**
 * Secondary card media — ~175px desktop.
 */
export function NewsSecondaryMedium({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);

  return (
    <article className="relative group rounded-xl overflow-hidden h-full hover:ring-1 hover:ring-white/15 transition-all">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>
      {post.coverUrl ? (
        <Image src={post.coverUrl} alt="" fill sizes="(min-width:1024px) 28vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
      )}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.0) 0%,rgba(0,0,0,0.6) 55%,rgba(0,0,0,0.94) 100%)' }} />
      <div className="absolute top-2 left-2 z-10">
        <span className={`inline-flex items-center text-[8px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border backdrop-blur-sm ${cat.bg} ${cat.text} ${cat.border}`}>
          {cat.label}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <h3 className="font-display font-black uppercase text-white tracking-tight leading-[1.05] line-clamp-2 text-[13px] md:text-[14px]">
          {post.title}
        </h3>
        <time className="text-[8px] text-white/30 uppercase tracking-wider mt-1 block">{date}</time>
      </div>
    </article>
  );
}

/**
 * Compact strip — thumbnail izquierda + texto derecha. ~100px desktop.
 * Para entrevista/clip destacado o última noticia.
 */
export function NewsCompactStrip({ post, label }: { readonly post: PostWithTalents; readonly label?: string | undefined }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);

  return (
    <article className="relative group rounded-xl overflow-hidden bg-[#0c1016] border border-white/[0.07] hover:border-white/[0.15] transition-all h-full flex">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>
      {/* Thumbnail izquierda */}
      <div className="relative w-[120px] md:w-[140px] shrink-0 overflow-hidden">
        {post.coverUrl ? (
          <Image src={post.coverUrl} alt="" fill sizes="140px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
        )}
      </div>
      {/* Texto derecha */}
      <div className="flex flex-col justify-center px-3 md:px-4 py-2 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {label ? (
            <span className="text-[8px] font-black uppercase tracking-wider text-sp-orange bg-sp-orange/10 border border-sp-orange/20 px-1.5 py-0.5 rounded-full">
              {label}
            </span>
          ) : (
            <span className={`text-[8px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 border ${cat.bg} ${cat.text} ${cat.border}`}>
              {cat.label}
            </span>
          )}
        </div>
        <h3 className="font-display font-black uppercase text-white text-[12px] md:text-[13px] tracking-tight leading-[1.1] line-clamp-2">
          {post.title}
        </h3>
        <time className="text-[8px] text-white/30 uppercase tracking-wider mt-1">{date}</time>
      </div>
    </article>
  );
}

/**
 * Mini-card para grid de 4 debajo — por si se necesita en otro contexto.
 */
export function NewsMiniCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);

  return (
    <article className="relative group rounded-xl overflow-hidden h-[150px] md:h-[165px] hover:ring-1 hover:ring-white/15 transition-all">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>
      {post.coverUrl ? (
        <Image src={post.coverUrl} alt="" fill sizes="(min-width:1024px) 18vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
      )}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.0) 20%,rgba(0,0,0,0.92) 100%)' }} />
      <div className="absolute top-2 left-2 z-10">
        <span className={`inline-flex items-center text-[7px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 border ${cat.bg} ${cat.text} ${cat.border}`}>
          {cat.label.slice(0, 5)}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
        <h3 className="font-display font-black uppercase text-white text-[12px] tracking-tight leading-[1.1] line-clamp-2">
          {post.title}
        </h3>
        <time className="text-[8px] text-white/30 uppercase tracking-wider mt-0.5 block">{date}</time>
      </div>
    </article>
  );
}

// Keep for backward compatibility
export const NewsSecondaryCard = NewsSecondaryLarge;
