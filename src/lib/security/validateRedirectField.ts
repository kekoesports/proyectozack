import { assertSafeRedirect, UnsafeRedirectError } from './assertSafeRedirect';
import { logRedacted } from '@/lib/log';

export const UNSAFE_REDIRECT_MESSAGE = 'URL no permitida';

/**
 * Run `assertSafeRedirect` and translate failures into the canonical
 * `{ ok: false, fieldErrors: { redirectUrl: [...] } }` shape consumed by
 * Server Action results. Logs the rejection reason via `logRedacted`.
 */
export function validateRedirectField(
  url: string,
  allowedHosts: readonly string[],
  logPrefix: string,
):
  | { ok: true }
  | { ok: false; fieldErrors: { redirectUrl: string[] } } {
  try {
    assertSafeRedirect(url, allowedHosts);
    return { ok: true };
  } catch (err) {
    const reason = err instanceof UnsafeRedirectError ? err.message : 'unsafe_redirect';
    logRedacted('warn', `${logPrefix} unsafe redirect rejected:`, reason);
    return { ok: false, fieldErrors: { redirectUrl: [UNSAFE_REDIRECT_MESSAGE] } };
  }
}
