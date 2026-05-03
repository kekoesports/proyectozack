'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Pair = { alt: string; targetLang: 'EN' | 'ES' };

// Pares ES↔EN — sincronizar con sitemap.ts si se añade una landing nueva.
// Para betting el ES único es /servicios/igaming (decisión PR #51 del dev),
// /influencers-betting redirige 301 y queda fuera del map.
const PAIRS: Record<string, Pair> = {
  '/influencers-cs2':              { alt: '/cs2-influencer-marketing',     targetLang: 'EN' },
  '/agencia-influencers-valorant': { alt: '/valorant-influencers-agency',  targetLang: 'EN' },
  '/servicios/igaming':            { alt: '/betting-influencers',          targetLang: 'EN' },
  '/agencia-marketing-esports':    { alt: '/esports-marketing-agency',     targetLang: 'EN' },
  '/cs2-influencer-marketing':     { alt: '/influencers-cs2',              targetLang: 'ES' },
  '/valorant-influencers-agency':  { alt: '/agencia-influencers-valorant', targetLang: 'ES' },
  '/betting-influencers':          { alt: '/servicios/igaming',            targetLang: 'ES' },
  '/esports-marketing-agency':     { alt: '/agencia-marketing-esports',    targetLang: 'ES' },
};

/** Útil para que el Nav decida si renderiza el wrapper del toggle. */
export function hasLangAlternate(pathname: string): boolean {
  return pathname in PAIRS;
}

type Props = {
  className?: string;
  onNavigate?: () => void;
};

/**
 * Toggle EN/ES. Solo se renderiza si la ruta actual tiene un equivalente
 * declarado en PAIRS. Si no hay equivalente, retorna null (no mostramos
 * un fallback genérico que mande al visitante a una landing aleatoria).
 */
export function LangSwitch({ className, onNavigate }: Props): React.JSX.Element | null {
  const pathname = usePathname() ?? '/';
  const pair = PAIRS[pathname];

  if (!pair) return null;

  const ariaLabel = pair.targetLang === 'EN' ? 'Switch to English' : 'Cambiar a español';

  return (
    <Link
      href={pair.alt}
      hrefLang={pair.targetLang.toLowerCase()}
      aria-label={ariaLabel}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      className={
        className ??
        'inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-white border border-white/15 hover:border-white/40 rounded-full transition-colors'
      }
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      {pair.targetLang}
    </Link>
  );
}
