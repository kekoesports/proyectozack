import { env } from '@/lib/env';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';

/**
 * Auth result for the skill-driven CLI endpoints (/api/admin/discover/*,
 * /api/admin/targets/{import,active}).
 *
 * - 'ok' → caller is authenticated; proceed.
 * - 'missing-config' → server has no TARGETS_IMPORT_TOKEN configured (503).
 * - 'unauthorized' → header missing/malformed/wrong token (401).
 *
 * Three-state result so the caller can distinguish a misconfiguration (503)
 * from a real auth failure (401). Logs must never include the token bytes
 * or the bearer header (regla TS #10).
 */
export type TargetsImportAuthResult =
  | { ok: true }
  | { ok: false; reason: 'missing-config' }
  | { ok: false; reason: 'unauthorized' };

const BEARER_PREFIX = 'Bearer ';

export function verifyTargetsImportToken(req: Request): TargetsImportAuthResult {
  const expected = env.TARGETS_IMPORT_TOKEN;
  if (!expected) return { ok: false, reason: 'missing-config' };

  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return { ok: false, reason: 'unauthorized' };
  }

  const presented = header.slice(BEARER_PREFIX.length).trim();
  if (presented.length === 0) return { ok: false, reason: 'unauthorized' };

  return timingSafeEqual(presented, expected)
    ? { ok: true }
    : { ok: false, reason: 'unauthorized' };
}
