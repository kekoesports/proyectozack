/**
 * Sanitiza el parámetro `returnTo` del flow Steam OpenID.
 *
 * Reglas de aceptación (todo lo demás cae al fallback):
 *   - Debe ser un string no vacío.
 *   - Debe empezar por `/` (path absoluto).
 *   - NO puede empezar por `//` (protocol-relative → open redirect).
 *   - NO puede contener `\` (backslash trick usado para saltarse validaciones).
 *   - El pathname resultante debe ser exactamente `/sorteos` o empezar por
 *     `/sorteos/` — nada de `/admin`, `/api`, `/marcas`, `/sorteosXYZ`, etc.
 *   - Debe parsearse como URL válida (con base ficticia).
 *
 * Preserva pathname + query. **NO preserva hash** — el navegador nunca
 * envía el fragment en la request al server, así que es irrecuperable
 * en el flow OpenID. Preservar hash requiere mejora client-side aparte.
 */

/** Ruta a la que redirigimos si el returnTo no es aceptable. */
export const SAFE_RETURN_FALLBACK = '/sorteos';

/** Prefijos aceptados como "dentro de /sorteos". */
const SORTEOS_ROOT = '/sorteos';

export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return SAFE_RETURN_FALLBACK;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return SAFE_RETURN_FALLBACK;

  // Debe empezar por `/`, y NO por `//` (protocol-relative URL).
  if (!trimmed.startsWith('/')) return SAFE_RETURN_FALLBACK;
  if (trimmed.startsWith('//')) return SAFE_RETURN_FALLBACK;

  // Backslash puede engañar a algunos parsers (`/\evil.com`).
  if (trimmed.includes('\\')) return SAFE_RETURN_FALLBACK;

  // Prefiltro rápido: sólo /sorteos exacto o /sorteos/ o /sorteos?
  // Rechaza /sorteosXYZ, /admin, /api sin necesidad de parsear URL.
  const isRootExact = trimmed === SORTEOS_ROOT;
  const isRootWithQuery = trimmed.startsWith(SORTEOS_ROOT + '?');
  const isChildPath = trimmed.startsWith(SORTEOS_ROOT + '/');
  if (!isRootExact && !isRootWithQuery && !isChildPath) {
    return SAFE_RETURN_FALLBACK;
  }

  // Parseo final para descartar valores rotos (control chars, encodings raros)
  // y descartar hash si viniera por error. Base ficticia — no leaks del host.
  let parsed: URL;
  try {
    parsed = new URL(trimmed, 'https://socialpro.invalid');
  } catch {
    return SAFE_RETURN_FALLBACK;
  }

  // Última guard: el URL parser puede normalizar el pathname; verificamos que
  // sigue siendo /sorteos o /sorteos/* tras la normalización.
  const path = parsed.pathname;
  if (path !== SORTEOS_ROOT && !path.startsWith(SORTEOS_ROOT + '/')) {
    return SAFE_RETURN_FALLBACK;
  }

  // Reconstruir sin hash (aunque nunca debería llegar por servidor).
  return path + parsed.search;
}
