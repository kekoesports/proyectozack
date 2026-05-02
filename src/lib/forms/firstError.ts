/**
 * Devuelve el primer mensaje de error de un mapa `fieldErrors` retornado por
 * `parseFormData`. Útil para Server Actions cuyo state shape solo expone un
 * único `error: string` al UI.
 */
export function firstError(
  fieldErrors: Record<string, string[]>,
  fallback = 'Datos inválidos',
): string {
  for (const errs of Object.values(fieldErrors)) {
    const first = errs[0];
    if (first) return first;
  }
  return fallback;
}
