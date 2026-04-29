'use client';

import Image from 'next/image';
import { motion } from 'motion/react';

type TopWinnersProps = {
  winners: { winnerName: string; winnerAvatar: string | null; wins: number }[];
}

const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

/**
 * Ranking de top ganadores del hub de giveaways.
 *
 * @kind client
 * @feature giveaways
 * @route /giveaways
 * @example
 * ```tsx
 * <TopWinners winners={winners} />
 * ```
 */
export function TopWinners({ winners }: TopWinnersProps) {
  if (winners.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-display text-sm font-black uppercase tracking-[0.15em] text-white/50 mb-4 px-2">
        Top Ganadores
      </h3>
      <div className="space-y-1">
        {winners.map((w, i) => (
          <motion.div
            key={w.winnerName}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <span className="w-6 text-center text-sm shrink-0">
              {i < 3 ? medals[i] : <span className="text-[11px] text-white/30 font-bold">{i + 1}</span>}
            </span>
            {w.winnerAvatar ? (
              <Image src={w.winnerAvatar} alt={w.winnerName} width={28} height={28} className="w-7 h-7 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-sp-orange/20 flex items-center justify-center text-[10px] font-black text-sp-orange">
                {w.winnerName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white/80 truncate">{w.winnerName}</p>
            </div>
            <span className="text-[11px] font-black text-sp-orange">{w.wins}x</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
