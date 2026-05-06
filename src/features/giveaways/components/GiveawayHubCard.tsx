'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { CountdownTimer } from '@/features/creator-codes/components/CountdownTimer';
import type { GiveawayWithTalent } from '@/types';

type GiveawayHubCardProps = {
  readonly giveaway: GiveawayWithTalent;
};

/**
 * Card de un giveaway dentro del hub.
 *
 * @kind client
 * @feature giveaways
 * @route /giveaways
 * @example
 * ```tsx
 * <GiveawayHubCard giveaway={giveaway} />
 * ```
 */
export function GiveawayHubCard({ giveaway }: GiveawayHubCardProps): React.JSX.Element {
  const [expired, setExpired] = useState(false);
  const isFinished = expired || (giveaway.endsAt !== null && new Date(giveaway.endsAt) <= new Date());
  const handleExpired = useCallback(() => setExpired(true), []);

  const numericValue = giveaway.value
    ? parseFloat(giveaway.value.replace(/[^\d.,]/g, '').replace(',', '.'))
    : 0;
  const isHot = !isFinished && numericValue >= 3000;

  return (
    <motion.a
      href={isFinished ? '#' : giveaway.redirectUrl}
      target={isFinished ? '_self' : '_blank'}
      rel="noopener noreferrer"
      className={`gw-sp-card group relative block rounded-2xl border overflow-hidden transition-all duration-300 ${
        isFinished
          ? 'border-white/[0.03] bg-[#0e0e0e]/80 grayscale-[0.8] opacity-50 pointer-events-none'
          : 'border-white/[0.06] bg-[#0e0e0e]/95 hover:border-sp-orange/30 hover:shadow-[0_0_30px_rgba(245,99,42,0.08)]'
      }`}
      whileHover={{ y: isFinished ? 0 : -6, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
    >
      {/* Brand bar — logo protagonista */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-white/[0.03] border-b border-white/[0.04]">
        {giveaway.brandLogo ? (
          <Image
            src={giveaway.brandLogo}
            alt={giveaway.brandName}
            width={24}
            height={24}
            className="rounded-md object-contain bg-white/5 p-0.5 shrink-0"
          />
        ) : (
          <div className="h-6 w-6 rounded-md bg-sp-orange/20 flex items-center justify-center text-[10px] font-black text-sp-orange shrink-0">
            {giveaway.brandName.charAt(0)}
          </div>
        )}
        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/80 truncate">
          {giveaway.brandName}
        </span>
        {!isFinished && (
          <span className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-sp-orange animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-sp-orange/70">Live</span>
          </span>
        )}
      </div>

      {/* HOT badge */}
      {isHot && (
        <div className="absolute top-14 right-3 z-20 gw-hot-badge">
          <div className="px-2 py-1 rounded-md bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.4)]">
            HOT
          </div>
        </div>
      )}

      {/* Prize image */}
      <div className="relative aspect-[4/3] bg-gradient-to-b from-transparent to-black/20 overflow-hidden">
        {giveaway.imageUrl ? (
          <Image
            src={giveaway.imageUrl}
            alt={giveaway.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className={`object-contain p-6 drop-shadow-[0_0_20px_rgba(245,99,42,0.15)] transition-transform duration-500 group-hover:scale-110 ${isFinished ? '' : 'gw-sp-float'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10 text-5xl font-black">?</div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 pt-3 space-y-3">
        <div>
          <h3 className="font-black text-[13px] uppercase tracking-wide text-white/90 leading-tight line-clamp-2">
            {giveaway.title}
          </h3>
          {giveaway.value && (
            <p className="text-xl font-black mt-1.5 gw-sp-value">{giveaway.value}</p>
          )}
        </div>

        <div className="flex justify-center py-1">
          {isFinished ? (
            <div className="inline-flex px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30">Finalizado</span>
            </div>
          ) : (
            giveaway.endsAt ? <CountdownTimer endsAt={giveaway.endsAt.toISOString()} onExpiredAction={handleExpired} /> : null
          )}
        </div>

        {!isFinished && (
          <div className="pt-1">
            <div className="w-full py-3 rounded-lg bg-sp-grad text-white text-center text-[13px] font-black uppercase tracking-[0.1em] transition-all gw-sp-btn-glow group-hover:tracking-[0.15em]">
              Participar
            </div>
          </div>
        )}
      </div>

      {/* Creator footer */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-white/[0.02] border-t border-white/[0.04]">
        {giveaway.talent.photoUrl ? (
          <Image
            src={giveaway.talent.photoUrl}
            alt={giveaway.talent.name}
            width={24}
            height={24}
            className="rounded-full object-cover border border-white/10"
          />
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white/80 shrink-0"
            style={{
              background: `linear-gradient(135deg, ${giveaway.talent.gradientC1}, ${giveaway.talent.gradientC2})`,
            }}
          >
            {giveaway.talent.initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35 leading-none">
            Sorteo de
          </p>
          <p className="text-[11px] font-bold text-white/80 truncate leading-tight mt-0.5">
            {giveaway.talent.name}
          </p>
        </div>
      </div>
    </motion.a>
  );
}
