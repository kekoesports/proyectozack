import { env } from '@/lib/env';
import {
  KeydropDetailResponseSchema,
  KeydropListResponseSchema,
  type KeydropDetailResponse,
  type KeydropListResponse,
} from './types';

/**
 * Cliente server-only para la KeyDrop Giveaway API.
 *
 * Reglas obligatorias:
 *   - API key SOLO en `x-api-key` header, JAMÁS en URL query.
 *   - JAMÁS loggear la key ni el header completo.
 *   - Timeout 10s por request.
 *   - Cache Next `revalidate: 60` — 1 request por región cada minuto.
 *   - Errores devuelven { ok: false, error } sin exponer body de KeyDrop.
 *
 * Sin key configurada → devuelve `{ ok: false, error: 'not_configured' }`.
 * La UI degradará silenciosamente (no muestra el bloque).
 */

const BASE_URL = 'https://ws-2071.socket-cs.com/v1/giveaway-user';
const FETCH_TIMEOUT_MS = 10_000;
/** Cache Next per-region. 60s → 1 req/min máximo por edge. */
const REVALIDATE_SECONDS = 60;

export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'not_configured' | 'timeout' | 'network' | 'http' | 'parse'; status?: number };

/** True si la key está configurada. Útil para gate UI antes de hacer fetch. */
export function isKeydropConfigured(): boolean {
  return typeof env.KEYDROP_ZACKETIZOR_API_KEY === 'string' && env.KEYDROP_ZACKETIZOR_API_KEY.length > 0;
}

/** GET /api/list — sorteos activos + finalizados del afiliado. */
export async function fetchKeydropList(): Promise<ClientResult<KeydropListResponse>> {
  return safeFetch('/api/list', KeydropListResponseSchema);
}

/** GET /api/giveaway/:id — detalle enriquecido de un sorteo. */
export async function fetchKeydropGiveaway(id: string): Promise<ClientResult<KeydropDetailResponse>> {
  // id validado por caller — aquí solo url-encodeamos por defensa.
  const safeId = encodeURIComponent(id);
  return safeFetch(`/api/giveaway/${safeId}`, KeydropDetailResponseSchema);
}

async function safeFetch<T>(
  path: string,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: unknown } },
): Promise<ClientResult<T>> {
  const apiKey = env.KEYDROP_ZACKETIZOR_API_KEY;
  if (!apiKey) return { ok: false, error: 'not_configured' };

  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
        'User-Agent': 'SocialPro-Giveaways/1.0',
      },
      signal: controller.signal,
      // Cache ISR de Next per-region — reduce hits a KeyDrop.
      next: { revalidate: REVALIDATE_SECONDS, tags: ['keydrop'] },
    });
  } catch (e) {
    const isAbort = e instanceof Error && e.name === 'AbortError';
    // Log seguro: código de error, NUNCA la URL completa ni el header.
    console.warn(`[keydrop] fetch ${path} ${isAbort ? 'timeout' : 'network'} error`);
    return { ok: false, error: isAbort ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    console.warn(`[keydrop] fetch ${path} http_${res.status}`);
    return { ok: false, error: 'http', status: res.status };
  }

  let body: unknown;
  try { body = await res.json(); }
  catch {
    console.warn(`[keydrop] fetch ${path} parse (non-json)`);
    return { ok: false, error: 'parse' };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Log seguro: solo indica que el shape no cuadra. NO dumpear body.
    console.warn(`[keydrop] fetch ${path} shape_mismatch`);
    return { ok: false, error: 'parse' };
  }

  return { ok: true, data: parsed.data as T };
}
