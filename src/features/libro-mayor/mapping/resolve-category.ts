import { ACCOUNT_MAP, PGC_GROUPS, type AccountMapping, type PgcGroupCode } from './account-map';

/**
 * Dado un código de cuenta (p.ej. "43000299"), devuelve el mapping por prefijo
 * de 3 dígitos si existe, o `null` si el prefijo es desconocido.
 * NUNCA lanza — es tolerante a códigos no mapeados (retorna null).
 */
export function resolveAccountMapping(code: string): AccountMapping | null {
  if (!code || code.length < 3) return null;
  const prefix = code.substring(0, 3);
  return ACCOUNT_MAP.find((m) => m.prefix === prefix) ?? null;
}

/**
 * Grupo PGC (primer dígito). Retorna null para códigos no numéricos.
 */
export function resolvePgcGroup(code: string): { code: PgcGroupCode; name: string } | null {
  if (!code || !/^\d/.test(code)) return null;
  const first = code[0] as PgcGroupCode;
  if (!(first in PGC_GROUPS)) return null;
  return { code: first, name: PGC_GROUPS[first] };
}

/**
 * Convenience: categoría o "Sin categoría" para tablas.
 */
export function categoryLabel(code: string): string {
  return resolveAccountMapping(code)?.category ?? 'Sin categoría';
}
