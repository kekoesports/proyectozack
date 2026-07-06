/**
 * Config de premios del ranking mensual SocialPro.
 *
 * Regla del proyecto (Fase 1): no entregamos premios automáticamente. La
 * lista es puramente informativa/copy visible. Cuando un mes no está
 * configurado el bloque muestra "Premios de {mes} próximamente".
 *
 * Para actualizar los premios de un mes, editar el mapa `MONTHLY_PRIZES`
 * abajo. La key es "YYYY-MM". Sin PR, sin panel admin (pendiente fase 2).
 */

export interface RankingPrize {
  readonly position: 1 | 2 | 3;
  readonly title: string;
  readonly description?: string;
}

export interface MonthlyPrizeConfig {
  readonly prizes: readonly RankingPrize[];
  /** Copy inline extra opcional — p.ej. "sujeto a revisión manual". */
  readonly notice?: string;
}

/**
 * Premios por mes. Vacío por defecto — Pablo/Alfonso rellenan cuando
 * cierran los premios de cada mes.
 */
export const MONTHLY_PRIZES: Record<string, MonthlyPrizeConfig> = {
  // Ejemplo (comentado — activar cuando estén confirmados):
  // '2026-08': {
  //   prizes: [
  //     { position: 1, title: 'Skin CS2 premium', description: 'AK-47 · Redline FT' },
  //     { position: 2, title: 'Skin CS2' },
  //     { position: 3, title: 'Puntos extra SocialPro' },
  //   ],
  //   notice: 'Entrega sujeta a revisión manual y Steam Trade URL configurada.',
  // },
};

/** Formatea "YYYY-MM" en el mes natural en curso (UTC). */
export function currentMonthKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Nombre del mes en español para el copy fallback. */
export function monthNameEs(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const idx = Number(m) - 1;
  const names = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return names[idx] ? `${names[idx]} ${y}` : monthKey;
}

/** Devuelve la config del mes actual, o `null` si no está configurada. */
export function getCurrentMonthPrizes(): MonthlyPrizeConfig | null {
  return MONTHLY_PRIZES[currentMonthKey()] ?? null;
}
