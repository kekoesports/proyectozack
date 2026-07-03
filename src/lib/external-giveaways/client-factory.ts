import type { ExternalFetchResult, ProviderKey } from './types';

/**
 * Factory de fetch genérico para providers externos.
 *
 * Comportamiento compartido:
 *   - Timeout 10s via AbortController.
 *   - Cache Next `revalidate: N` por provider (configurable).
 *   - Sin key → devuelve `not_configured` (no lanza).
 *   - Errores clasificados en `ExternalFetchResult['error']`.
 *   - Logs seguros: `[<providerKey>] fetch <path> <errorType>`. NUNCA la key,
 *     nunca headers completos, nunca body upstream.
 *   - Zod parse antes de retornar. Shape mismatch → `parse`.
 *
 * Este helper se usa desde cada provider concreto en
 * `src/lib/external-giveaways/providers/<key>/fetch.ts`.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Realiza una petición server-only autenticada a un provider externo,
 * valida el shape con Zod y devuelve el resultado o un error clasificado.
 *
 * Reglas duras de seguridad (verificadas en tests estructurales):
 *   - `apiKey` va SIEMPRE en header (nombre configurable). JAMÁS en URL.
 *   - `apiKey` NUNCA aparece en `console.*`, ni el `authHeader` completo.
 *   - `path` es concatenado al `baseUrl` sin sanitización adicional — el
 *     caller debe url-encodear componentes de path (ids etc.).
 */
export async function safeExternalFetch<T>(config: {
  providerKey: ProviderKey;
  baseUrl: string;
  path: string;
  apiKey: string | undefined;
  authHeader: string;
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: unknown } };
  revalidateSeconds?: number;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}): Promise<ExternalFetchResult<T>> {
  const {
    providerKey,
    baseUrl,
    path,
    apiKey,
    authHeader,
    schema,
    revalidateSeconds = 60,
    extraHeaders = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = config;

  if (!apiKey) return { ok: false, error: 'not_configured' };

  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        [authHeader]: apiKey,
        Accept: 'application/json',
        'User-Agent': 'SocialPro-Giveaways/1.0',
        ...extraHeaders,
      },
      signal: controller.signal,
      next: { revalidate: revalidateSeconds, tags: [providerKey] },
    });
  } catch (e) {
    const isAbort = e instanceof Error && e.name === 'AbortError';
    console.warn(`[${providerKey}] fetch ${path} ${isAbort ? 'timeout' : 'network'} error`);
    return { ok: false, error: isAbort ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    console.warn(`[${providerKey}] fetch ${path} http_${res.status}`);
    return { ok: false, error: 'http', status: res.status };
  }

  let body: unknown;
  try { body = await res.json(); }
  catch {
    console.warn(`[${providerKey}] fetch ${path} parse (non-json)`);
    return { ok: false, error: 'parse' };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.warn(`[${providerKey}] fetch ${path} shape_mismatch`);
    return { ok: false, error: 'parse' };
  }
  return { ok: true, data: parsed.data as T };
}
