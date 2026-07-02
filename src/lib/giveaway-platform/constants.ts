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

/** Devuelve la fecha YYYY-MM-DD actual en la TZ de la plataforma. */
export function todayInPlatformTz(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PLATFORM_TZ }).format(new Date());
}
