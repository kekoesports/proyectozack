'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { GiveawayWithTalent } from '@/types';

function useCountdown(endsAt: Date) {
  const calc = useCallback(() => {
    const diff = endsAt.getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  }, [endsAt]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

function SorteoSidebarCard({ giveaway }: { giveaway: GiveawayWithTalent }): React.JSX.Element {
  const time = useCountdown(giveaway.endsAt);
  const isActive = time !== null;

  const digits = time
    ? [
        { v: time.d, l: 'Días' },
        { v: time.h, l: 'Hrs' },
        { v: time.m, l: 'Min' },
        { v: time.s, l: 'Seg' },
      ]
    : null;

  return (
    <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#0c0c0c] group hover:border-sp-orange/30 transition-all duration-300">
      {/* Brand header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05] bg-white/[0.02]">
        {giveaway.brandLogo ? (
          <Image
            src={giveaway.brandLogo}
            alt={giveaway.brandName}
            width={16}
            height={16}
            className="rounded object-contain"
          />
        ) : (
          <div className="h-4 w-4 rounded bg-sp-orange/20 flex items-center justify-center text-[8px] font-black text-sp-orange shrink-0">
            {giveaway.brandName.charAt(0)}
          </div>
        )}
        <span className="flex-1 text-[10px] font-black uppercase tracking-[0.1em] text-white/50 truncate">
          {giveaway.brandName}
        </span>
        {isActive && (
          <span className="flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-black uppercase text-emerald-400/70">Live</span>
          </span>
        )}
      </div>

      {/* Prize image */}
      <div className="relative w-full h-32 overflow-hidden bg-gradient-to-b from-white/[0.03] to-black/30">
        <div
          className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(245,99,42,0.25) 0%, transparent 70%)' }}
          aria-hidden
        />
        {giveaway.imageUrl ? (
          <Image
            src={giveaway.imageUrl}
            alt={giveaway.title}
            fill
            sizes="200px"
            className="object-contain p-4 drop-shadow-[0_0_16px_rgba(245,99,42,0.2)] transition-transform duration-500 group-hover:scale-105 gw-sp-float"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10 text-3xl font-black">?</div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-2">
        <p className="text-[11px] font-black text-white/85 leading-tight line-clamp-2 mb-1.5">
          {giveaway.title}
        </p>
        {giveaway.value && (
          <p className="text-xl font-black gw-sp-value mb-2">{giveaway.value}</p>
        )}

        {/* Countdown */}
        {digits ? (
          <div className="grid grid-cols-4 gap-1 mb-3">
            {digits.map(({ v, l }) => (
              <div key={l} className="rounded-lg bg-black/40 border border-white/[0.06] py-1.5 text-center">
                <p className="text-sm font-black text-white/90 tabular-nums leading-none">
                  {String(v).padStart(2, '0')}
                </p>
                <p className="text-[8px] uppercase tracking-wider text-white/30 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/25 mb-3">Finalizado</p>
        )}

        {/* CTA */}
        {isActive && (
          <a
            href={giveaway.redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg bg-sp-grad text-white text-[11px] font-black uppercase tracking-[0.12em] gw-sp-btn-glow transition-all hover:opacity-90"
          >
            Participar →
          </a>
        )}
      </div>
    </div>
  );
}

type GiveawaySidebarPanelProps = {
  readonly giveaways: readonly GiveawayWithTalent[];
};

/**
 * Panel lateral que lista giveaways con detalle y acciones.
 *
 * @kind client
 * @feature giveaways
 * @route /giveaways
 * @example
 * ```tsx
 * <GiveawaySidebarPanel giveaways={giveaways} />
 * ```
 */
export function GiveawaySidebarPanel({ giveaways }: GiveawaySidebarPanelProps): React.JSX.Element | null {
  const active = giveaways.filter((g) => new Date(g.endsAt) > new Date());
  if (active.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
          Sorteos activos
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400/60 tabular-nums">{active.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {active.map((g) => (
          <SorteoSidebarCard key={g.id} giveaway={g} />
        ))}
      </div>
    </div>
  );
}
