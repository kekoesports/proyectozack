/**
 * Fuentes permitidas de puntos (`coinTransactions.source`).
 *
 * Guardrail para mantener el modelo defendible como programa de
 * fidelización + sorteo promocional gratuito (ver docs/rewards-policy.md).
 *
 * Cualquier fuente fuera de la allowlist es rechazada por
 * `assertAllowedCoinSource`. Esto impide (por diseño) que se pueda
 * insertar una transacción con fuente tipo "apuesta", "ruleta",
 * "jackpot", "multiplicador", "case_battle", "upgrader" o
 * "partner_deposit".
 *
 * Ampliar la allowlist requiere revisión legal explícita.
 */

/**
 * Enum canónico de fuentes válidas. Coincide con `coinTransactions.source`
 * declarado en `src/db/schema/coinTransactions.ts`.
 */
export const ALLOWED_COIN_SOURCES = [
  'racha',
  'mision',
  'sorteo',
  'tienda',
  'admin',
] as const;

export type AllowedCoinSource = (typeof ALLOWED_COIN_SOURCES)[number];

/**
 * Fuentes explícitamente vetadas. No es una lista exhaustiva; sirve para
 * documentar qué patrones queremos bloquear. La comprobación real la hace
 * `assertAllowedCoinSource` contra la allowlist.
 *
 * Cualquier intento de insertar una de estas fuentes debe producir un
 * error visible en logs y romper el test unitario.
 */
export const FORBIDDEN_COIN_SOURCES = [
  'apuesta',
  'wager',
  'bet',
  'gamble',
  'ruleta',
  'wheel',
  'spin',
  'jackpot',
  'multiplicador',
  'multiply',
  'case_battle',
  'case_opening',
  'box',
  'upgrader',
  'upgrade',
  'partner_deposit',
  'deposit',
  'cara_cruz',
  'coin_flip',
] as const;

/**
 * Error thrown por `assertAllowedCoinSource`. Se mantiene como clase
 * propia para que los server actions puedan diferenciarlo de otros
 * fallos de validación.
 */
export class ForbiddenCoinSourceError extends Error {
  readonly source: string;
  constructor(source: string) {
    super(`Coin source "${source}" is not in the allowlist. See docs/rewards-policy.md.`);
    this.name = 'ForbiddenCoinSourceError';
    this.source = source;
  }
}

/**
 * Rechaza cualquier fuente que no esté en la allowlist canónica.
 *
 * Debe llamarse en TODA función de server que inserte en
 * `coinTransactions`. Si en el futuro se añade una fuente nueva,
 * hay que:
 *
 *   1. Añadirla al enum del schema (`coinTransactions.source`).
 *   2. Añadirla a `ALLOWED_COIN_SOURCES` en este archivo.
 *   3. Justificarla en `docs/rewards-policy.md`.
 *   4. Confirmar con abogado que la nueva fuente no rompe la
 *      calificación de "acción objetiva verificable".
 *
 * @throws {ForbiddenCoinSourceError} si `source` no está permitido.
 */
export function assertAllowedCoinSource(source: string): asserts source is AllowedCoinSource {
  const normalised = source.trim().toLowerCase();
  const isAllowed = (ALLOWED_COIN_SOURCES as readonly string[]).includes(normalised);
  if (!isAllowed) {
    throw new ForbiddenCoinSourceError(source);
  }
}

/**
 * Variante non-throw para checks defensivos en render (p.ej. admin panel
 * que muestra intentos de inserción bloqueados).
 */
export function isAllowedCoinSource(source: string): source is AllowedCoinSource {
  const normalised = source.trim().toLowerCase();
  return (ALLOWED_COIN_SOURCES as readonly string[]).includes(normalised);
}
