import { env } from '@/lib/env';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';

export type AutomationAuthResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'missing-config' | 'unauthorized' };

const BEARER_PREFIX = 'Bearer ';

/**
 * Autenticación de servicio para `/api/automation/*`.
 *
 * Usa un token independiente del cron y de los imports para limitar el radio
 * de impacto de cada credencial. Nunca registra el header ni el token.
 */
export function verifyAutomationToken(req: Request): AutomationAuthResult {
  const expected = env.AUTOMATION_API_TOKEN;
  if (!expected) return { ok: false, reason: 'missing-config' };

  const header = req.headers.get('authorization');
  if (!header?.startsWith(BEARER_PREFIX)) {
    return { ok: false, reason: 'unauthorized' };
  }

  const presented = header.slice(BEARER_PREFIX.length).trim();
  if (!presented) return { ok: false, reason: 'unauthorized' };

  return timingSafeEqual(presented, expected)
    ? { ok: true }
    : { ok: false, reason: 'unauthorized' };
}
