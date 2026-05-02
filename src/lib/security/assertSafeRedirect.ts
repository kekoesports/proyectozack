export class UnsafeRedirectError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'UnsafeRedirectError';
  }
}

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export interface AssertSafeRedirectOptions {
  /**
   * Permite hosts locales (`localhost`, `127.0.0.1`, `[::1]`). Por defecto
   * `true` solo en desarrollo. El caller puede sobreescribir explícitamente.
   */
  readonly allowLocalhost?: boolean;
}

/**
 * Valida que `url` sea un redirect seguro: protocolo http(s), sin userinfo,
 * y host en `allowedHosts` (o localhost en dev). Throws `UnsafeRedirectError`
 * en caso contrario. Retorna el `URL` parseado en caso de éxito.
 *
 * Comparación de hosts case-insensitive. `allowedHosts` debe contener solo
 * hostnames (sin protocolo ni path).
 */
export function assertSafeRedirect(
  url: string,
  allowedHosts: readonly string[],
  opts: AssertSafeRedirectOptions = {},
): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UnsafeRedirectError('invalid_url');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeRedirectError('protocol_not_allowed');
  }

  if (parsed.username !== '' || parsed.password !== '') {
    throw new UnsafeRedirectError('userinfo_not_allowed');
  }

  const host = parsed.hostname.toLowerCase();

  if (LOCALHOST_HOSTS.has(host)) {
    const allowLocalhost = opts.allowLocalhost ?? process.env.NODE_ENV === 'development';
    if (!allowLocalhost) {
      throw new UnsafeRedirectError('localhost_not_allowed');
    }
    return parsed;
  }

  const allowed = allowedHosts.map((h) => h.toLowerCase());
  if (!allowed.includes(host)) {
    throw new UnsafeRedirectError(`host_not_allowed:${host}`);
  }
  return parsed;
}
