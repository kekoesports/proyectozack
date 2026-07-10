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
  /**
   * URL absoluta o path desde /public a la imagen del premio. Opcional —
   * si falta, la UI pinta el emoji del podium (🥇/🥈/🥉) como placeholder.
   * Rellenar cuando se cierre el asset de cada mes; no hace falta que
   * sea la foto final del artículo (una imagen genérica ya orienta).
   */
  readonly imageUrl?: string;
}

export interface MonthlyPrizeConfig {
  readonly prizes: readonly RankingPrize[];
  /** Copy inline extra opcional — p.ej. "sujeto a revisión manual". */
  readonly notice?: string;
}

/**
 * Premios por mes. Los títulos y descripciones son placeholders honestos
 * ("Premio mensual destacado" / "Premio mensual") hasta que se cierre
 * cada mes con el catálogo real. La imagen se rellena aparte editando
 * `imageUrl` — hasta entonces la UI muestra el placeholder textual.
 *
 * Regla 2026-07-10 (Fase 1 PR4): siempre debe haber al menos el mes
 * actual configurado para que `/sorteos/#recompensas` no muestre
 * "Premios de {mes} próximamente" en producción.
 */
export const MONTHLY_PRIZES: Record<string, MonthlyPrizeConfig> = {
  '2026-07': {
    prizes: [
      {
        position: 1,
        title: 'Premio mensual destacado',
        description: 'Skin CS2 · asignada al cierre del mes.',
      },
      {
        position: 2,
        title: 'Premio mensual',
        description: 'Skin CS2 · asignada al cierre del mes.',
      },
      {
        position: 3,
        title: 'Premio mensual',
        description: 'Tarjeta regalo · asignada al cierre del mes.',
      },
    ],
    notice:
      'Los premios finales se anuncian en la sección de recompensas al cierre del mes. Entrega sujeta a revisión manual y Steam Trade URL configurada.',
  },
  '2026-08': {
    prizes: [
      { position: 1, title: 'Premio mensual destacado' },
      { position: 2, title: 'Premio mensual' },
      { position: 3, title: 'Premio mensual' },
    ],
    notice: 'Detalles del mes se cerrarán antes del 1 de agosto.',
  },
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

/**
 * Devuelve el premio configurado para una posición del ranking del mes
 * actual, o `null` si no hay premio para esa posición (o si el mes no
 * está configurado). Facilita el render inline en `MonthlyPointsRanking`
 * sin que el componente tenga que manejar el config completo.
 */
export function getCurrentPrizeForPosition(position: number): RankingPrize | null {
  const config = getCurrentMonthPrizes();
  if (!config) return null;
  return config.prizes.find((p) => p.position === position) ?? null;
}
