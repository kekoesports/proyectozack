'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GiveawayPrizePlaceholder } from './GiveawayPrizePlaceholder';
import type { GiveawayWithTalent } from '@/types';

type Props = {
  readonly giveaway: GiveawayWithTalent;
  readonly finished?: boolean;
};

function inferRarityGlow(value: string | null): string {
  if (!value) return 'rgba(255,255,255,0.04)';
  const n = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
  if (isNaN(n)) return 'rgba(255,255,255,0.04)';
  if (n >= 3000) return 'rgba(251,191,36,0.14)';
  if (n >= 1000) return 'rgba(139,58,173,0.14)';
  if (n >= 200)  return 'rgba(91,155,213,0.12)';
  return 'rgba(255,255,255,0.04)';
}

function CountdownSmall({ endsAt, nowMs }: { endsAt: Date; nowMs: number }): React.ReactElement {
  const diff = endsAt.getTime() - nowMs;
  if (diff <= 0) return <span className="text-white/25 text-[10px]">Ended</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return <span className="font-mono text-[#C3FC00] text-[11px] font-black tabular-nums">{d}d {h}h</span>;
  if (h > 0) return <span className="font-mono text-amber-400 text-[11px] font-black tabular-nums">{h}h {m}m</span>;
  return <span className="font-mono text-red-400 text-[11px] font-black tabular-nums animate-pulse">{m}m</span>;
}

/**
 * Fila compacta de sorteo con hover-expand premium.
 * Default: ~64px. Hover: reveal visual del premio + CTA fuerte.
 */
export function GiveawayRow({ giveaway, finished = false }: Props): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [nowMs]                 = useState(Date.now);

  const endsAt    = giveaway.endsAt;
  const isActive  = !finished && (endsAt === null || endsAt.getTime() > nowMs);
  const diffMs    = endsAt ? endsAt.getTime() - nowMs : null;
  const isUrgent  = diffMs !== null && diffMs > 0 && diffMs < 86400000;
  const glowColor = isActive ? inferRarityGlow(giveaway.value) : 'transparent';

  const expanded = hovered && isActive && !finished;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={`relative group overflow-hidden rounded-xl border transition-all duration-300 ease-out cursor-default ${
        finished
          ? 'border-white/[0.04] bg-[#080808] opacity-45'
          : expanded
            ? 'border-white/15'
            : 'border-white/[0.07] bg-[#090909] hover:border-white/12'
      }`}
      style={{
        boxShadow: expanded ? `0 0 32px ${glowColor}, inset 0 0 0 0 transparent` : undefined,
        background: expanded
          ? `radial-gradient(60% 80% at 20% 50%, ${glowColor} 0%, #090909 60%)`
          : undefined,
      }}
    >
      {/* Línea live en top */}
      {isActive && (
        <div className={`absolute top-0 inset-x-0 h-px transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-40'}`}
          style={{ background: `linear-gradient(90deg, transparent, ${glowColor.replace('0.', '0.9')}, transparent)` }}
          aria-hidden />
      )}

      {/* ESTADO COMPACTO — siempre visible */}
      <div className={`flex items-center transition-all duration-300 ${expanded ? 'h-[68px]' : 'h-[60px]'}`}>
        {/* Thumbnail compacto */}
        <div className={`relative shrink-0 h-full border-r border-white/[0.05] bg-white/[0.02] transition-all duration-300 ${expanded ? 'w-[72px]' : 'w-[56px]'}`}>
          {giveaway.imageUrl && !imgError ? (
            <Image src={giveaway.imageUrl} alt={giveaway.title} fill sizes="72px"
              className={`object-contain p-1.5 transition-transform duration-500 ${expanded ? 'scale-110' : 'scale-100'}`}
              onError={() => setImgError(true)} />
          ) : (
            <GiveawayPrizePlaceholder size="sm" />
          )}
        </div>

        {/* Info compacta */}
        <div className="flex-1 min-w-0 flex items-center gap-3 px-3 sm:px-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 truncate">{giveaway.brandName}</span>
              {isActive && (
                <span className={`shrink-0 flex items-center gap-1 text-[8px] font-black text-[#C3FC00] transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-60'}`}>
                  <span className="w-1 h-1 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                  Live
                </span>
              )}
              {isUrgent && <span className="shrink-0 text-[8px] font-black text-amber-400/80">⚡</span>}
            </div>
            <p className={`font-bold leading-tight truncate transition-all duration-300 ${
              finished ? 'text-[12px] text-white/35' : expanded ? 'text-[14px] text-white' : 'text-[13px] text-white/80'
            }`}>
              {giveaway.title}
            </p>
          </div>

          {giveaway.value && !finished && (
            <span className={`shrink-0 font-black tabular-nums transition-all duration-300 ${expanded ? 'text-[14px] text-white' : 'text-[12px] text-white/50'}`}>
              {giveaway.value}
            </span>
          )}

          {!finished && diffMs !== null && (
            <div className="shrink-0">
              {endsAt && <CountdownSmall endsAt={endsAt} nowMs={nowMs} />}
            </div>
          )}
        </div>

        {/* CTA compacto — solo flecha cuando no está expandido */}
        {!finished ? (
          <div className={`shrink-0 h-full flex items-center border-l border-white/[0.05] transition-all duration-300 ${expanded ? 'w-0 overflow-hidden opacity-0' : 'w-10 opacity-100'}`}>
            <span className="w-full text-center text-white/25 text-sm font-bold">→</span>
          </div>
        ) : (
          <div className="shrink-0 w-10 h-full flex items-center border-l border-white/[0.04]">
            <span className="w-full text-center text-[9px] text-white/15 font-bold uppercase tracking-wider">End</span>
          </div>
        )}
      </div>

      {/* EXPANSIÓN — solo visible en hover/active */}
      <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? 'max-h-[120px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-4 pt-1 flex items-center gap-4">
          {/* Imagen grande en expand */}
          <div className="relative w-20 h-16 shrink-0 rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.06]">
            {giveaway.imageUrl && !imgError ? (
              <Image src={giveaway.imageUrl} alt={giveaway.title} fill sizes="80px"
                className="object-contain p-1.5 scale-110 transition-transform duration-700" />
            ) : (
              <GiveawayPrizePlaceholder size="sm" />
            )}
          </div>

          {/* Info expandida */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {giveaway.value && (
                <span className="text-[11px] font-black text-white/60">Valor <span className="text-white">{giveaway.value}</span></span>
              )}
              {diffMs !== null && diffMs > 0 && endsAt && (
                <span className="text-[10px] text-white/35 tabular-nums">· Quedan <CountdownSmall endsAt={endsAt} nowMs={nowMs} /></span>
              )}
            </div>
            <a href={giveaway.redirectUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-sp-grad text-white text-[11px] font-black uppercase tracking-[0.15em] shadow-[0_2px_16px_rgba(245,99,42,0.2)] hover:shadow-[0_4px_24px_rgba(245,99,42,0.35)] transition-all">
              PARTICIPAR →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
