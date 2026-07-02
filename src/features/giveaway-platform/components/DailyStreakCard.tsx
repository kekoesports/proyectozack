'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { claimDailyReward } from '@/app/sorteos/plataforma/actions';
import { STREAK_REWARDS } from '@/lib/giveaway-platform/constants';

interface Props {
  currentDay: number;
  claimedToday: boolean;
}

export function DailyStreakCard({ currentDay, claimedToday }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClaim() {
    startTransition(async () => {
      const result = await claimDailyReward();
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        Racha actual: <b className="text-foreground">{claimedToday ? currentDay : currentDay - 1} días</b>
        {' · '}cantidades fijas, sin azar
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {STREAK_REWARDS.map((reward, i) => {
          const day = i + 1;
          const isClaimed = day < currentDay || (day === currentDay && claimedToday);
          const isToday = day === currentDay && !claimedToday;
          return (
            <div
              key={day}
              className={`min-w-[92px] flex-1 rounded-lg border p-3 text-center text-sm ${
                isClaimed
                  ? 'border-emerald-600/50 bg-emerald-600/10'
                  : isToday
                    ? 'border-amber-500/70'
                    : 'border-border bg-muted/30'
              }`}
            >
              <div className="text-xs uppercase text-muted-foreground">Día {day}</div>
              <div className="mt-1 font-bold">🪙 {reward}</div>
              {isToday ? (
                <button
                  onClick={handleClaim}
                  disabled={isPending}
                  className="mt-2 w-full rounded bg-amber-500 px-2 py-1.5 text-xs font-bold text-black disabled:opacity-50"
                >
                  {isPending ? '…' : 'Reclamar'}
                </button>
              ) : null}
              {isClaimed ? <div className="mt-1 text-xs text-emerald-400">✔</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
