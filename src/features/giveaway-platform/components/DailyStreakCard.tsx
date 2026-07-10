'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { claimDailyReward } from '@/app/sorteos/plataforma/actions';
import { STREAK_REWARDS, nextStreakDay } from '@/lib/giveaway-platform/constants';

interface Props {
  /**
   * Último día de racha completado por el usuario. Semántica:
   * al reclamar día N, el server escribe `currentDay = N`. La UI infiere
   * el próximo día pendiente sumando 1 (con rotación 7→1).
   */
  currentDay: number;
  claimedToday: boolean;
  /**
   * `true` si la racha se rompió (no reclamado ni hoy ni ayer). En ese
   * caso el próximo claim va a resetear a día 1 en el server —
   * anticipamos ese estado en la UI para no engañar al usuario con
   * "próximo día N+1" cuando realmente va a recibir el día 1.
   */
  streakBroken?: boolean;
}

export function DailyStreakCard({ currentDay, claimedToday, streakBroken = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClaim() {
    startTransition(async () => {
      const result = await claimDailyReward();
      if (result.ok) router.refresh();
    });
  }

  // Días completados que ya deberían pintarse con ✓ en el grid.
  //  - racha rota → 0 (el próximo claim volverá a día 1).
  //  - si no, `currentDay` es siempre el último día reclamado (haya sido
  //    hoy o ayer). Reclamar hoy nunca disminuye ese contador.
  const completedDays = streakBroken ? 0 : currentDay;

  // Día pendiente de reclamar HOY, si lo hay. Con racha viva es el
  // siguiente al último completado; con racha rota vuelve a día 1.
  const pendingDay = claimedToday
    ? null
    : streakBroken
      ? 1
      : nextStreakDay(currentDay);

  return (
    <>
      <p className="gp-streak-head">
        Racha actual: <b>{completedDays} días</b> · cantidades fijas, sin azar
      </p>
      <div className="gp-streak-grid">
        {STREAK_REWARDS.map((reward, i) => {
          const day = i + 1;
          const isClaimed = day <= completedDays;
          const isToday = day === pendingDay;
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
