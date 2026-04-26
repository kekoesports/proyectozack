'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { GiveawayWithTalent } from '@/types';

type CardProps = {
  readonly giveaway: GiveawayWithTalent;
};

function SidebarGiveawayCard({ giveaway }: CardProps): React.JSX.Element {
  const [expired, setExpired] = useState(false);
  const isActive = !expired && new Date(giveaway.endsAt) > new Date();
  const handleExpired = useCallback(() => setExpired(true), []);

  // Auto-expire after mount
  if (!isActive && !expired) handleExpired();

  if (!isActive) return <></>;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] overflow-hidden group hover:border-sp-orange/25 transition-all duration-300">
      {/* Brand bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border-b border-white/[0.05]">
        {giveaway.brandLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={giveaway.brandLogo}
            alt={giveaway.brandName}
            className="h-4 w-4 rounded object-contain bg-white/5 shrink-0"
          />
        ) : (
          <div className="h-4 w-4 rounded bg-sp-orange/20 flex items-center justify-center text-[8px] font-black text-sp-orange shrink-0">
            {giveaway.brandName.charAt(0)}
          </div>
        )}
        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/60 truncate flex-1">
          {giveaway.brandName}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </span>
      </div>

      {/* Prize image */}
      <div className="relative h-28 bg-gradient-to-b from-white/[0.02] to-black/20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(245,99,42,0.2) 0%, transparent 70%)' }}
          aria-hidden
        />
        {giveaway.imageUrl ? (
          <Image
            src={giveaway.imageUrl}
            alt={giveaway.title}
            fill
            sizes="200px"
            className="object-contain p-4 drop-shadow-[0_0_12px_rgba(245,99,42,0.15)] transition-transform duration-500 group-hover:scale-105 gw-sp-float"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10 text-3xl font-black">?</div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-[11px] font-black text-white/85 leading-tight line-clamp-2 mb-1">
          {giveaway.title}
        </p>
        {giveaway.value && (
          <p className="text-base font-black gw-sp-value">{giveaway.value}</p>
        )}
      </div>

      {/* CTA */}
      <div className="px-3 pb-3 pt-1">
        <a
          href={giveaway.redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-sp-grad text-white text-[10px] font-black uppercase tracking-[0.12em] gw-sp-btn-glow transition-all hover:opacity-90"
        >
          Participar
          <span aria-hidden>→</span>
        </a>
      </div>
    </div>
  );
}

type GiveawaySidebarPanelProps = {
  readonly giveaways: readonly GiveawayWithTalent[];
};

export function GiveawaySidebarPanel({ giveaways }: GiveawaySidebarPanelProps): React.JSX.Element | null {
  if (giveaways.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
          Sorteos activos
        </h2>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400/60 tabular-nums">{giveaways.length}</span>
        </span>
      </div>

      <div className="space-y-3">
        {giveaways.map((g) => (
          <SidebarGiveawayCard key={g.id} giveaway={g} />
        ))}
      </div>

      {giveaways.length > 2 && (
        <Link
          href="/sorteos"
          className="flex items-center justify-center gap-1.5 mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/25 hover:text-sp-orange/60 transition-colors"
        >
          Ver todos →
        </Link>
      )}
    </div>
  );
}
