import type { ArticleEmbed, EmbedPlatform } from './types';

function extractXHandle(url: string): string | null {
  const m = url.match(/(?:x|twitter)\.com\/([^/?#\s]+)/);
  const handle = m?.[1];
  if (!handle || ['i', 'home', 'explore', 'notifications', 'messages', 'hashtag', 'search'].includes(handle)) return null;
  return handle;
}

const PLATFORM_META: Record<EmbedPlatform, {
  label: string;
  cta: string;
  ringClass: string;
  iconBg: string;
  iconFg: string;
}> = {
  x: {
    label: 'X (Twitter)',
    cta: 'Ver post en X',
    ringClass: 'border-white/12 hover:border-white/30',
    iconBg: 'bg-white',
    iconFg: 'text-sp-black',
  },
  youtube: {
    label: 'YouTube',
    cta: 'Ver vídeo',
    ringClass: 'border-red-500/30 hover:border-red-500/55',
    iconBg: 'bg-red-500',
    iconFg: 'text-white',
  },
  hltv: {
    label: 'HLTV',
    cta: 'Ver en HLTV',
    ringClass: 'border-amber-400/30 hover:border-amber-400/55',
    iconBg: 'bg-amber-400',
    iconFg: 'text-sp-black',
  },
};

function PlatformIcon({ platform, className }: { platform: EmbedPlatform; className: string }) {
  if (platform === 'x') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.965 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
        />
      </svg>
    );
  }
  if (platform === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path fill="currentColor" d="M10 15l5.19-3L10 9v6Zm11.56-7.83a2.78 2.78 0 0 0-1.94-1.94C17.88 4.75 12 4.75 12 4.75s-5.88 0-7.62.48a2.78 2.78 0 0 0-1.94 1.94A29.94 29.94 0 0 0 2 12a29.94 29.94 0 0 0 .44 4.83 2.78 2.78 0 0 0 1.94 1.94c1.74.48 7.62.48 7.62.48s5.88 0 7.62-.48a2.78 2.78 0 0 0 1.94-1.94A29.94 29.94 0 0 0 22 12a29.94 29.94 0 0 0-.44-4.83Z" />
      </svg>
    );
  }
  return (
    <span className={`${className} font-display font-black flex items-center justify-center`}>HLTV</span>
  );
}

type Props = { readonly embed: ArticleEmbed };

/**
 * Card editorial de contenido externo. Sin twitter widgets.js (CSP + CLS=0).
 * Diseñado para parecer "media card" premium, no skeleton.
 */
export function ArticleEmbedBlock({ embed }: Props) {
  const meta = PLATFORM_META[embed.platform];
  const displayAuthor = embed.author ?? (embed.platform === 'x' ? extractXHandle(embed.url) : null);

  return (
    <section className="max-w-2xl mx-auto px-5 md:px-8 my-12 md:my-16">
      <a
        href={embed.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block bg-[#0c1016] border ${meta.ringClass} rounded-2xl overflow-hidden transition-colors`}
      >
        <header className="flex items-center gap-3 px-5 md:px-7 pt-5 md:pt-6 pb-3">
          <span
            aria-hidden
            className={`flex-none w-10 h-10 md:w-11 md:h-11 rounded-full ${meta.iconBg} ${meta.iconFg} flex items-center justify-center`}
          >
            <PlatformIcon platform={embed.platform} className="w-5 h-5 md:w-[22px] md:h-[22px]" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-sm md:text-base text-white leading-none truncate">
              {displayAuthor ? `@${displayAuthor}` : meta.label}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45 mt-1.5 leading-none">
              {meta.label}
              {embed.publishedAt ? (
                <>
                  <span aria-hidden className="text-white/15 mx-1.5">·</span>
                  {embed.publishedAt}
                </>
              ) : null}
            </p>
          </div>
        </header>

        {embed.title ? (
          <div className="px-5 md:px-7 pb-4">
            <p className="font-display font-black uppercase tracking-tight text-lg md:text-xl text-white leading-[1.2]">
              {embed.title}
            </p>
          </div>
        ) : null}

        {embed.excerpt ? (
          <div className="px-5 md:px-7 pb-5">
            <p className="text-sm md:text-base text-white/65 leading-[1.55]">{embed.excerpt}</p>
          </div>
        ) : null}

        <footer className="border-t border-white/[0.05] px-5 md:px-7 py-3.5 flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55 leading-none">
            Fuente externa
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sp-orange group-hover:text-white inline-flex items-center gap-1.5 leading-none transition-colors">
            {meta.cta}
            <span aria-hidden className="group-hover:translate-x-0.5 transition-transform">→</span>
          </p>
        </footer>
      </a>
    </section>
  );
}
