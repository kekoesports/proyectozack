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

  const displayedStreak = claimedToday ? currentDay : Math.max(0, currentDay - 1);

  return (
    <>
      <p className="gp-streak-head">
        Racha actual: <b>{displayedStreak} días</b> · cantidades fijas, sin azar
      </p>
      <div className="gp-streak-grid">
        {STREAK_REWARDS.map((reward, i) => {
          const day = i + 1;
          const isClaimed = day < currentDay || (day === currentDay && claimedToday);
          const isToday = day === currentDay && !claimedToday;
          return (
            <div
              key={day}
              className={`gp-streak-day${isClaimed ? ' is-claimed' : ''}${isToday ? ' is-today' : ''}`}
            >
              {isClaimed ? <span className="gp-streak-check">✓</span> : null}
              <div className="gp-streak-label">Día {day}</div>
              <div className="gp-streak-amount">⭐ {reward}</div>
              {isToday ? (
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={isPending}
                  className="gp-streak-claim"
                >
                  {isPending ? '…' : 'Reclamar'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
