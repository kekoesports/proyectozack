import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';

/**
 * Comparación constante en tiempo de dos strings. Retorna `false` sin comparar
 * cuando las longitudes difieren (early-return). Si coinciden, delega a
 * `crypto.timingSafeEqual` sobre buffers UTF-8.
 *
 * Use para tokens, hashes o cualquier secret donde un atacante pueda observar
 * el timing de la comparación. NO usar para strings públicas (hostnames, etc.).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return nodeTimingSafeEqual(aBuf, bBuf);
}
