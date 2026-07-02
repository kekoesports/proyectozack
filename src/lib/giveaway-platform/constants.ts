/**
 * Configuración de la plataforma de sorteos.
 * Todas las recompensas son cantidades FIJAS y deterministas:
 * sin apuestas ni azar con pérdida (fuera del ámbito DGOJ).
 */

/** Monedas por participar en un sorteo. */
export const ENTRY_COIN_REWARD = 20;

/** Recompensa fija por día de racha (índice 0 = día 1). */
export const STREAK_REWARDS = [10, 15, 20, 25, 30, 40, 60] as const;

/** Slugs de talents visibles en el selector de creador de la plataforma. */
export const PLATFORM_CREATOR_SLUGS = ['naow', 'huasopeek', 'martinez'] as const;

/** Zona horaria para el corte del día de la racha y el mes del ranking. */
export const PLATFORM_TZ = 'Europe/Madrid';

/** Tipos de condición soportados por el motor de misiones. */
export const MISSION_CONDITION_TYPES = [
  'entries_total',        // COUNT total de giveaway_entries del usuario
  'entries_this_month',   // COUNT del mes calendario Europe/Madrid actual
  'distinct_creators',    // COUNT DISTINCT talent_id join a giveaways
  'streak_days',          // dailyStreaks.currentDay (racha consecutiva 1-7)
  'redemptions_total',    // COUNT total de redemptions del usuario
] as const;
export type MissionConditionType = (typeof MISSION_CONDITION_TYPES)[number];

/** Devuelve la fecha YYYY-MM-DD actual en la TZ de la plataforma. */
export function todayInPlatformTz(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PLATFORM_TZ }).format(new Date());
}

/**
 * Dado un YYYY-MM-DD, devuelve el día anterior en formato YYYY-MM-DD.
 * Aritmética de calendario pura → inmune a cambios de DST.
 *
 * @example previousDay('2026-03-30') === '2026-03-29'
 * @example previousDay('2026-01-01') === '2025-12-31'
 */
export function previousDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Fecha inválida: ${dateStr}`);
  // Date.UTC con day-1 rueda mes/año automáticamente.
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().slice(0, 10);
}

/**
 * Devuelve el siguiente día de racha aplicando la regla de rotación:
 *   día 1..6 → +1
 *   día 7 (último de STREAK_REWARDS) → vuelve a 1
 */
export function nextStreakDay(current: number): number {
  if (current < 1) return 1;
  if (current >= STREAK_REWARDS.length) return 1;
  return current + 1;
}

/**
 * Devuelve el instante UTC del primer día del mes actual en `Europe/Madrid`.
 *
 * Ejemplo (Julio 2026, Madrid CEST = UTC+2):
 *   madrid  → 2026-07-01T00:00:00
 *   UTC     → 2026-06-30T22:00:00Z
 *
 * Ejemplo (Enero 2026, Madrid CET = UTC+1):
 *   madrid  → 2026-01-01T00:00:00
 *   UTC     → 2025-12-31T23:00:00Z
 *
 * Usar para filtrar `giveaway_entries.created_at >= startOfCurrentMonthUtc()`.
 */
export function startOfCurrentMonthUtc(nowIso: string = todayInPlatformTz()): Date {
  const [y, m] = nowIso.split('-').map(Number);
  if (!y || !m) throw new Error(`Fecha inválida: ${nowIso}`);
  // 1) Instante UTC "candidato" — midnight UTC del día 1.
  const probe = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  // 2) Offset de Madrid en ese instante (60 en invierno, 120 en verano).
  const offsetMin = madridUtcOffsetMinutes(probe);
  // 3) Madrid 00:00 = probe + offsetMin → UTC objetivo = probe − offsetMin.
  return new Date(probe.getTime() - offsetMin * 60_000);
}

/**
 * Offset de `Europe/Madrid` respecto a UTC en minutos para un instante dado.
 * Robusto ante DST: pregunta a `Intl` la hora formateada en Madrid, la
 * reinterpreta como UTC y compara con el instante original.
 */
export function madridUtcOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PLATFORM_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const madridIso = `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}Z`;
  const madridAsUtc = new Date(madridIso).getTime();
  return Math.round((madridAsUtc - instant.getTime()) / 60_000);
}
