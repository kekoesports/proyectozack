/**
 * Tests puros de la racha diaria — sin DB, sin acción.
 * Cubre:
 *   - previousDay: día anterior en calendario (inmune a DST)
 *   - nextStreakDay: rotación 1..7 con 7→1
 *   - startOfCurrentMonthUtc / madridUtcOffsetMinutes: TZ Europe/Madrid
 *
 * La action `claimDailyReward` combina estas piezas puras con la
 * concurrencia condicional del UPDATE (`IS DISTINCT FROM today`) y
 * el `insert().onConflictDoNothing()` para primera vez — patrones ya
 * verificados por SQL y por el test de shell PR1.
 */

import {
  STREAK_REWARDS,
  madridUtcOffsetMinutes,
  nextStreakDay,
  previousDay,
  startOfCurrentMonthUtc,
} from '@/lib/giveaway-platform/constants';

describe('[daily-streak] previousDay — aritmética de calendario', () => {
  it('resta un día dentro del mismo mes', () => {
    expect(previousDay('2026-07-15')).toBe('2026-07-14');
  });
  it('cambia de mes al restar al día 1', () => {
    expect(previousDay('2026-07-01')).toBe('2026-06-30');
  });
  it('cambia de año en 1 de enero', () => {
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
  });
  it('respeta año bisiesto (2024-03-01 → 2024-02-29)', () => {
    expect(previousDay('2024-03-01')).toBe('2024-02-29');
  });
  it('respeta año NO bisiesto (2025-03-01 → 2025-02-28)', () => {
    expect(previousDay('2025-03-01')).toBe('2025-02-28');
  });
  it('inmune a cambio DST primavera Madrid (30/03 → 29/03)', () => {
    // 2025-03-30 es cambio a horario de verano en Madrid.
    // Aritmética de calendario nos da la fecha correcta.
    expect(previousDay('2025-03-30')).toBe('2025-03-29');
  });
  it('inmune a cambio DST otoño Madrid (26/10 → 25/10)', () => {
    // 2025-10-26 es cambio a horario de invierno en Madrid.
    expect(previousDay('2025-10-26')).toBe('2025-10-25');
  });
  it('rechaza input inválido', () => {
    expect(() => previousDay('no-es-fecha')).toThrow();
  });
});

describe('[daily-streak] nextStreakDay — rotación 1..7 con 7→1', () => {
  it('día 1 → 2', () => { expect(nextStreakDay(1)).toBe(2); });
  it('día 2 → 3', () => { expect(nextStreakDay(2)).toBe(3); });
  it('día 6 → 7', () => { expect(nextStreakDay(6)).toBe(7); });
  it('día 7 → 1 (rotación, la regla clave del PR)', () => {
    expect(nextStreakDay(7)).toBe(1);
  });
  it('valor fuera de rango → 1 (fallback defensivo)', () => {
    expect(nextStreakDay(0)).toBe(1);
    expect(nextStreakDay(-5)).toBe(1);
    expect(nextStreakDay(99)).toBe(1);
  });
  it('cubre todos los días definidos en STREAK_REWARDS', () => {
    // Sanity: la tabla tiene exactamente 7 valores.
    expect(STREAK_REWARDS).toHaveLength(7);
    // Cada día produce el siguiente esperado.
    for (let d = 1; d <= 6; d++) {
      expect(nextStreakDay(d)).toBe(d + 1);
    }
    expect(nextStreakDay(STREAK_REWARDS.length)).toBe(1);
  });
});

describe('[daily-streak] TZ Europe/Madrid', () => {
  it('madridUtcOffsetMinutes = 60 en enero (CET)', () => {
    // 15 de enero de 2026, mediodía UTC.
    const winter = new Date('2026-01-15T12:00:00Z');
    expect(madridUtcOffsetMinutes(winter)).toBe(60);
  });
  it('madridUtcOffsetMinutes = 120 en julio (CEST)', () => {
    // 15 de julio de 2026, mediodía UTC.
    const summer = new Date('2026-07-15T12:00:00Z');
    expect(madridUtcOffsetMinutes(summer)).toBe(120);
  });

  it('startOfCurrentMonthUtc para julio 2026 → 2026-06-30T22:00:00Z (Madrid CEST = UTC+2)', () => {
    const start = startOfCurrentMonthUtc('2026-07-05');
    expect(start.toISOString()).toBe('2026-06-30T22:00:00.000Z');
  });
  it('startOfCurrentMonthUtc para enero 2026 → 2025-12-31T23:00:00Z (Madrid CET = UTC+1)', () => {
    const start = startOfCurrentMonthUtc('2026-01-05');
    expect(start.toISOString()).toBe('2025-12-31T23:00:00.000Z');
  });
});

describe('[daily-streak] escenarios de negocio (composición pura de helpers)', () => {
  // Simulamos la lógica de la action sin DB: (lastClaimDate, currentDay, today) → nextDay
  function computeNextDay(lastClaimDate: string | null, currentDay: number, today: string): number {
    if (lastClaimDate === null) return 1;
    if (lastClaimDate === today) throw new Error('mismo día bloqueado');
    return lastClaimDate === previousDay(today) ? nextStreakDay(currentDay) : 1;
  }

  it('primera vez (sin racha previa) → día 1', () => {
    expect(computeNextDay(null, 0, '2026-07-15')).toBe(1);
  });
  it('mismo día → throw (bloqueado)', () => {
    expect(() => computeNextDay('2026-07-15', 3, '2026-07-15')).toThrow('mismo día bloqueado');
  });
  it('día consecutivo → currentDay + 1', () => {
    expect(computeNextDay('2026-07-14', 3, '2026-07-15')).toBe(4);
  });
  it('saltando un día → reset a día 1', () => {
    // Última racha el 13, hoy es 15 → 14 se saltó → reset.
    expect(computeNextDay('2026-07-13', 5, '2026-07-15')).toBe(1);
  });
  it('día 7 consecutivo → vuelve a día 1 (regla clave)', () => {
    expect(computeNextDay('2026-07-14', 7, '2026-07-15')).toBe(1);
  });
  it('día 7 tras saltar → reset a día 1 igualmente', () => {
    expect(computeNextDay('2026-07-13', 7, '2026-07-15')).toBe(1);
  });
});
