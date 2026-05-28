'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import Image from 'next/image';
import { GiveawayPrizePlaceholder } from './GiveawayPrizePlaceholder';
import { isIGamingBrand } from '@/lib/igaming';
import type { GiveawayWithTalent } from '@/types';

const FEATURED_BADGE_MAP: Record<string, { label: string; cls: string }> = {
  HOT:       { label: '🔥 HOT',       cls: 'bg-orange-500/15 border-orange-400/30 text-orange-300' },
  NUEVO:     { label: '✨ Nuevo',      cls: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300' },
  EXCLUSIVO: { label: '👑 Exclusivo', cls: 'bg-purple-500/15 border-purple-400/30 text-purple-300' },
  TOP:       { label: '⭐ TOP',        cls: 'bg-amber-500/15 border-amber-400/30 text-amber-300' },
  LIMITED:   { label: '⚡ Limited',   cls: 'bg-red-500/15 border-red-400/30 text-red-300' },
};

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
    glow:   'rgba(251,191,36,0.22)',
    badge:  'bg-gradient-to-r from-amber-400 to-orange-400 text-black',
    border: 'border-amber-400/35',
    label:  '★★★ Legendario',
  },
  epic: {
    glow:   'rgba(139,58,173,0.25)',
    badge:  'bg-gradient-to-r from-sp-purple to-sp-dpink text-white',
    border: 'border-sp-purple/35',
    label:  '★★ Épico',
  },
  rare: {
    glow:   'rgba(91,155,213,0.2)',
    badge:  'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
    border: 'border-blue-400/30',
    label:  '★ Raro',
  },
  common: {
    glow:   'rgba(255,255,255,0.05)',
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

export function GiveawayFeatured({ giveaway }: Props): React.JSX.Element {
  const [imgError, setImgError] = useState(false);
  const [nowMs]                 = useState(Date.now);
  const trackEvent = trpc.giveaways.trackEvent.useMutation();
  const rarity      = inferRarity(giveaway.value);
  const needsAge18  = isIGamingBrand(giveaway.brandName);
  const cfg         = RARITY_CONFIG[rarity];
  const badgeCfg    = giveaway.badge ? (FEATURED_BADGE_MAP[giveaway.badge] ?? { label: giveaway.badge, cls: 'bg-sp-orange/15 border-sp-orange/30 text-sp-orange' }) : null;
  const isLive   = giveaway.endsAt === null || giveaway.endsAt.getTime() > nowMs;
  const isUrgent = giveaway.endsAt !== null && giveaway.endsAt.getTime() - nowMs < 86400000;

  // Detectar multi-item en el título (separados por " + ")
  const itemCount = (giveaway.title.match(/ \+ /g)?.length ?? 0) + 1;
  const hasImage  = !!giveaway.imageUrl && !imgError;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${cfg.border} bg-[#060606] flex flex-col sm:flex-row`}
      style={{ boxShadow: `0 0 60px ${cfg.glow}, 0 2px 0 0 transparent` }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent 10%, ${cfg.glow.replace(/[\d.]+\)$/, '0.9)')}, transparent 90%)` }}
        aria-hidden />

      {/* ── Visual Impact Area — 45% ancho en desktop ── */}
      <a
        href={giveaway.redirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Participar en ${giveaway.title}`}
        className="relative sm:w-[45%] h-56 sm:h-auto shrink-0 overflow-hidden block"
        tabIndex={-1}
      >

        {/* Ambient blur — misma imagen desenfocada como fondo */}
        {hasImage && giveaway.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={giveaway.imageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-35 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none"
          />
        )}

        {/* Glow ambiental derivado de la rareza */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(70% 70% at 50% 50%, ${cfg.glow} 0%, transparent 70%)` }}
          aria-hidden />

        {/* Fade hacia la info en desktop */}
        <div className="absolute inset-y-0 right-0 w-12 hidden sm:block pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, #060606)' }}
          aria-hidden />
        {/* Fade inferior en mobile */}
        <div className="absolute inset-x-0 bottom-0 h-10 sm:hidden pointer-events-none"
          style={{ background: 'linear-gradient(0deg, #060606, transparent)' }}
          aria-hidden />

        {/* Imagen principal — sin padding, object-contain */}
        {hasImage && giveaway.imageUrl ? (
          <Image
            src={giveaway.imageUrl}
            alt={giveaway.title}
            fill
            sizes="(max-width: 640px) 100vw, 45vw"
            className="object-contain p-1 sm:p-2 transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            onError={() => setImgError(true)}
            priority
          />
        ) : (
          <GiveawayPrizePlaceholder size="lg" />
        )}

        {/* Badge multi-item */}
        {itemCount > 1 && (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-sm">
            <span className="text-[9px] font-black text-white/50 uppercase tracking-wider">{itemCount} items</span>
          </div>
        )}

        {/* Rareza badge */}
        {cfg.label && (
          <div className={`absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.badge}`}>
            {cfg.label}
          </div>
        )}
        {/* +18 badge */}
        {needsAge18 && (
          <div className="absolute top-2.5 right-2.5 z-10 px-1.5 py-0.5 rounded bg-black/70 border border-white/20 text-[9px] font-black text-white/60 tracking-wider">
            +18
          </div>
        )}
      </a>

      {/* ── Info lateral ── */}
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
          <div className="flex items-center gap-1.5">
            {badgeCfg && (
              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${badgeCfg.cls}`}>
                {badgeCfg.label}
              </span>
            )}
            {isLive && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C3FC00]/10 border border-[#C3FC00]/20 text-[9px] font-black uppercase tracking-wider text-[#C3FC00]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Premio */}
        <h3 className="font-display text-xl sm:text-2xl font-black uppercase leading-tight text-white mb-1">
          {giveaway.title}
        </h3>

        {/* Valor */}
        {giveaway.value && (
          <p className="text-[13px] font-black text-white/60 mb-4">
            Valor: <span className="text-white">{giveaway.value}</span>
          </p>
        )}

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
          <a
            href={giveaway.redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-sp-grad text-white text-[12px] font-black uppercase tracking-[0.15em] shadow-[0_2px_20px_rgba(245,99,42,0.2)] hover:shadow-[0_4px_30px_rgba(245,99,42,0.4)] hover:tracking-[0.2em] transition-all duration-300"
            onClick={() => {
              void trackEvent.mutateAsync({ action: 'click', giveawayId: giveaway.id }).catch(() => undefined);
            }}
          >
            PARTICIPAR EN EL SORTEO →
          </a>
        </div>
      </div>
    </div>
  );
}
