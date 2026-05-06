'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GiveawayPrizePlaceholder } from './GiveawayPrizePlaceholder';
import type { GiveawayWithTalent } from '@/types';

type Rarity = 'legendary' | 'epic' | 'rare' | 'common';

function inferRarity(value: string | null): Rarity {
  if (!value) return 'common';
  const n = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
  if (isNaN(n)) return 'common';
  if (n >= 3000) return 'legendary';
  if (n >= 1000) return 'epic';
  if (n >= 200)  return 'rare';
  return 'common';
}

const RARITY_CONFIG: Record<Rarity, { glow: string; badge: string; border: string; label: string | null }> = {
  legendary: {
    glow:   'rgba(251,191,36,0.18)',
    badge:  'bg-gradient-to-r from-amber-400 to-orange-400 text-black',
    border: 'border-amber-400/30',
    label:  '★★★ Legendario',
  },
  epic: {
    glow:   'rgba(139,58,173,0.2)',
    badge:  'bg-gradient-to-r from-sp-purple to-sp-dpink text-white',
    border: 'border-sp-purple/30',
    label:  '★★ Épico',
  },
  rare: {
    glow:   'rgba(91,155,213,0.15)',
    badge:  'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
    border: 'border-blue-400/25',
    label:  '★ Raro',
  },
  common: {
    glow:   'rgba(255,255,255,0.04)',
    badge:  '',
    border: 'border-white/[0.08]',
    label:  null,
  },
};

function CountdownCompact({ endsAt, nowMs }: { endsAt: Date; nowMs: number }): React.ReactElement {
  const diff = endsAt.getTime() - nowMs;
  if (diff <= 0) return <span className="text-white/30 text-xs">Finalizado</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return <span className="font-mono text-[#C3FC00] font-black text-sm tabular-nums">{d}d {h}h</span>;
  return <span className="font-mono text-amber-400 font-black text-sm tabular-nums">{h}h {m}m</span>;
}

type Props = { readonly giveaway: GiveawayWithTalent };

/**
 * Giveaway destacado — imagen grande lateral, glow de rareza, CTA fuerte.
 * Usado para el primer sorteo activo del creador.
 */
export function GiveawayFeatured({ giveaway }: Props): React.JSX.Element {
  const [imgError, setImgError] = useState(false);
  const [nowMs]                 = useState(Date.now);
  const rarity   = inferRarity(giveaway.value);
  const cfg      = RARITY_CONFIG[rarity];
  const isLive   = giveaway.endsAt === null || giveaway.endsAt.getTime() > nowMs;
  const isUrgent = giveaway.endsAt !== null && giveaway.endsAt.getTime() - nowMs < 86400000;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-[#080808] flex flex-col sm:flex-row`}
      style={{ boxShadow: `0 0 40px ${cfg.glow}, 0 0 0 0 transparent` }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(60% 80% at 20% 50%, ${cfg.glow} 0%, transparent 70%)` }}
        aria-hidden />
      {/* Top line */}
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.glow.replace('0.', '0.8').replace(',0.', ',1.')}, transparent)` }}
        aria-hidden />

      {/* Imagen del premio — 40% ancho desktop */}
      <div className="relative sm:w-[40%] h-44 sm:h-auto shrink-0 bg-gradient-to-br from-white/[0.03] to-transparent border-b sm:border-b-0 sm:border-r border-white/[0.06]">
        {giveaway.imageUrl && !imgError ? (
          <Image src={giveaway.imageUrl} alt={giveaway.title} fill
            sizes="(max-width: 640px) 100vw, 45vw"
            className="object-contain p-4 sm:p-5 transition-transform duration-700 hover:scale-105"
            onError={() => setImgError(true)} />
        ) : (
          <GiveawayPrizePlaceholder size="lg" />
        )}
        {/* Sin badge de rareza — el glow del borde ya comunica el valor */}
      </div>

      {/* Info */}
      <div className="relative flex-1 min-w-0 flex flex-col p-5 sm:p-6">
        {/* Marca + LIVE */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {giveaway.brandLogo ? (
              <Image src={giveaway.brandLogo} alt={giveaway.brandName} width={16} height={16}
                className="object-contain opacity-60" />
            ) : null}
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{giveaway.brandName}</span>
          </div>
          {isLive && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C3FC00]/10 border border-[#C3FC00]/20 text-[9px] font-black uppercase tracking-wider text-[#C3FC00]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
              Live
            </span>
          )}
        </div>

        {/* Premio — elemento principal */}
        <h3 className="font-display text-xl sm:text-2xl font-black uppercase leading-tight text-white mb-1">
          {giveaway.title}
        </h3>

        {/* Valor */}
        {giveaway.value && (
          <p className="text-[13px] font-black text-white/60 mb-4">
            Valor: <span className="text-white">{giveaway.value}</span>
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Countdown + CTA */}
        <div className="space-y-3">
          {giveaway.endsAt && (
            <div className="flex items-center gap-2">
              {isUrgent && <span className="text-[9px] text-amber-400/70 uppercase tracking-wider font-bold">⚡ Últimas horas</span>}
              <CountdownCompact endsAt={giveaway.endsAt} nowMs={nowMs} />
              <span className="text-[9px] text-white/20 uppercase tracking-wider">restantes</span>
            </div>
          )}
          <a href={giveaway.redirectUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-sp-grad text-white text-[12px] font-black uppercase tracking-[0.15em] shadow-[0_2px_20px_rgba(245,99,42,0.2)] hover:shadow-[0_4px_30px_rgba(245,99,42,0.35)] hover:tracking-[0.2em] transition-all duration-300">
            PARTICIPAR EN EL SORTEO →
          </a>
        </div>
      </div>
    </div>
  );
}
