'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { CountdownTimer } from './CountdownTimer';
import { UnboxReveal } from './UnboxReveal';
import type { Giveaway } from '@/types';

type GiveawayCardProps = {
  giveaway: Giveaway;
}

/**
 * Card individual de un giveaway en la página del creador.
 *
 * @kind client
 * @feature creator-codes
 * @route /[creatorSlug]
 * @example
 * ```tsx
 * <GiveawayCard giveaway={giveaway} />
 * ```
 */
export function GiveawayCard({ giveaway }: GiveawayCardProps) {
  const [expired, setExpired] = useState(false);
  const isFinished = expired || new Date(giveaway.endsAt) <= new Date();

  const handleExpired = useCallback(() => setExpired(true), []);

  // High-value detection for HOT badge
  const numericValue = giveaway.value
    ? parseFloat(giveaway.value.replace(/[^\d.,]/g, '').replace(',', '.'))
    : 0;
  const isHot = !isFinished && numericValue >= 3000;

  return (
    <motion.a
      href={isFinished ? '#' : giveaway.redirectUrl}
      target={isFinished ? '_self' : '_blank'}
      rel="noopener noreferrer"
      className={`gw-card-glow group block rounded-xl border overflow-hidden transition-all duration-300 ${
        isFinished
          ? 'border-white/[0.03] bg-[#08090a]/80 grayscale-[0.8] opacity-50 pointer-events-none'
          : 'border-white/[0.06] bg-[#0a0b0d]/90 hover:border-[#C3FC00]/30 hover:bg-[#0c0d10]/95 hover:shadow-[0_0_30px_rgba(195,252,0,0.06)]'
      }`}
      whileHover={{ y: isFinished ? 0 : -6, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
    >
      {/* Brand bar */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.04]">
        {giveaway.brandLogo && (
          <Image
            src={giveaway.brandLogo}
            alt={giveaway.brandName}
            width={18}
            height={18}
            className="rounded-sm object-contain opacity-60"
          />
        )}
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
          {giveaway.brandName}
        </span>
        {!isFinished && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C3FC00]/60">Live</span>
          </span>
        )}
      </div>

      {/* HOT badge for high-value prizes */}
      {isHot && (
        <div className="absolute top-12 right-3 z-20 gw-hot-badge">
          <div className="px-2 py-1 rounded-md bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.4)]">
            HOT
          </div>
        </div>
      )}

      {/* Prize image — unbox animation */}
      {giveaway.imageUrl ? (
        <UnboxReveal imageUrl={giveaway.imageUrl} alt={giveaway.title} isFinished={isFinished} />
      ) : (
        <div className="relative aspect-[4/3] bg-gradient-to-b from-transparent to-black/20 flex items-center justify-center">
          <span className="text-white/10 text-5xl font-black">?</span>
        </div>
      )}

      {/* Info */}
      <div className="p-4 pt-3 space-y-3">
        <div>
          <h3 className="font-black text-[13px] uppercase tracking-wide text-white/90 leading-tight">
            {giveaway.title}
          </h3>
          {giveaway.value && (
            <p className="text-xl font-black mt-1.5 gw-value-shimmer">
              {giveaway.value}
            </p>
          )}
        </div>

        {/* Countdown or Finished badge */}
        <div className="flex justify-center py-1">
          {isFinished ? (
            <div className="inline-flex px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30">Finalizado</span>
            </div>
          ) : (
            <CountdownTimer endsAt={giveaway.endsAt.toISOString()} onExpiredAction={handleExpired} />
          )}
        </div>

        {/* CTA Button */}
        {!isFinished && (
          <div className="pt-1">
            <div className="w-full py-3 rounded-lg bg-[#C3FC00] text-black text-center text-[13px] font-black uppercase tracking-[0.1em] giveaway-btn-glow group-hover:tracking-[0.15em]">
              Participar
            </div>
          </div>
        )}
      </div>
    </motion.a>
  );
}
