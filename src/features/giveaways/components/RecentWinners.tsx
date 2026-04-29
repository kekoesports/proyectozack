'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import type { GiveawayWinnerWithGiveaway } from '@/types';

type RecentWinnersProps = {
  winners: GiveawayWinnerWithGiveaway[];
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

/**
 * Listado de ganadores recientes en el hub de giveaways.
 *
 * @kind client
 * @feature giveaways
 * @route /giveaways
 * @example
 * ```tsx
 * <RecentWinners winners={winners} />
 * ```
 */
export function RecentWinners({ winners }: RecentWinnersProps) {
  if (winners.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-display text-sm font-black uppercase tracking-[0.15em] text-white/50 mb-4 px-2">
        Ganadores Recientes
      </h3>
      <div className="space-y-1">
        {winners.map((w, i) => (
          <motion.div
            key={w.id}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            {w.winnerAvatar ? (
              <Image src={w.winnerAvatar} alt={w.winnerName} width={28} height={28} className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-sp-pink/20 flex items-center justify-center text-[10px] font-black text-sp-pink shrink-0">
                {w.winnerName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white/70 truncate">{w.winnerName}</p>
              <p className="text-[10px] text-white/30 truncate">{w.giveaway.title}</p>
            </div>
            <span className="text-[10px] text-white/20 shrink-0">{timeAgo(w.wonAt)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
