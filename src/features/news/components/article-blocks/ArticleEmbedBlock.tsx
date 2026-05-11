import type { ArticleEmbed, EmbedPlatform } from './types';

const PLATFORM_LABEL: Record<EmbedPlatform, string> = {
  x: 'Ver en X',
  youtube: 'Ver en YouTube',
  hltv: 'Ver en HLTV',
};

const PLATFORM_ACCENT: Record<EmbedPlatform, string> = {
  x: 'border-white/15 hover:border-white/30',
  youtube: 'border-red-500/30 hover:border-red-500/55',
  hltv: 'border-amber-400/30 hover:border-amber-400/55',
};

const PLATFORM_DOT: Record<EmbedPlatform, string> = {
  x: 'bg-white/85',
  youtube: 'bg-red-500',
  hltv: 'bg-amber-400',
};

type Props = { readonly embed: ArticleEmbed };

/**
 * Card link a un tweet/video/fuente externa. Sin JS embed libs (no twitter
 * widgets) — mantiene CSP estricto y zero impact en LCP. Click = nuevo tab.
 */
export function ArticleEmbedBlock({ embed }: Props) {
  const accent = PLATFORM_ACCENT[embed.platform];
  const dot = PLATFORM_DOT[embed.platform];
  const label = PLATFORM_LABEL[embed.platform];

  return (
    <section className="max-w-3xl mx-auto px-5 md:px-8 mt-8 md:mt-10">
      <a
        href={embed.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block bg-sp-black border ${accent} rounded-2xl px-5 md:px-7 py-5 transition-colors`}
      >
        <div className="flex items-center gap-3 mb-3">
          <span aria-hidden className={`flex-none w-1.5 h-1.5 rounded-full ${dot}`} />
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/55 leading-none">
            {embed.platform === 'x' ? 'X (Twitter)' : embed.platform === 'youtube' ? 'YouTube' : 'HLTV'}
          </p>
          {embed.author ? (
            <>
              <span aria-hidden className="text-white/15">·</span>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 leading-none">
                @{embed.author}
              </p>
            </>
          ) : null}
        </div>
        {embed.title ? (
          <p className="font-display font-black uppercase text-base md:text-lg tracking-tight text-white leading-[1.15] mb-3">
            {embed.title}
          </p>
        ) : null}
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55 group-hover:text-white inline-flex items-center gap-1.5 leading-none transition-colors">
          {label}
          <span aria-hidden className="group-hover:translate-x-0.5 transition-transform">→</span>
        </p>
      </a>
    </section>
  );
}
