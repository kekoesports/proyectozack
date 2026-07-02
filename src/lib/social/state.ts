import crypto from 'node:crypto';
import { env } from '@/lib/env';

/**
 * State cookie anti-CSRF para OAuth. Se emite en `connect`, se verifica
 * en `callback`. Formato serializado y firmado con HMAC-SHA256 usando
 * `BETTER_AUTH_SECRET` (misma clave que Better Auth para no proliferar
 * secretos).
 *
 * TTL de 10 minutos: suficiente para completar el consent screen del
 * provider en cualquier condición razonable de red/UI.
 */

export const STATE_COOKIE_NAME = 'social_oauth_state';
export const STATE_TTL_MS = 10 * 60 * 1000;

export interface StatePayload {
  /** valor aleatorio único de la petición (32 bytes → 43 chars base64url) */
  state: string;
  /** provider al que apunta este flujo — evita reuse cross-provider */
  provider: string;
  /** timestamp de emisión (ms desde epoch) */
  ts: number;
}

/** Genera un state aleatorio 32B → base64url. */
export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** Firma un payload y devuelve `<base64url(json)>.<base64url(hmac)>`. */
export function signState(payload: StatePayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = hmac(body);
  return `${body}.${sig}`;
}

/**
 * Verifica el cookie value, la firma y el TTL. Devuelve el payload
 * decodificado si todo cuadra, `null` si algo falla.
 *
 * Constant-time signature compare para evitar timing attacks.
 */
export function verifyState(cookieValue: string | undefined, expectedProvider: string): StatePayload | null {
  if (!cookieValue) return null;
  const dot = cookieValue.indexOf('.');
  if (dot <= 0 || dot === cookieValue.length - 1) return null;
  const body = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);

  const expectedSig = hmac(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StatePayload;
  } catch { return null; }

  if (typeof payload.state !== 'string' || typeof payload.provider !== 'string' || typeof payload.ts !== 'number') {
    return null;
  }
  if (payload.provider !== expectedProvider) return null;
  if (Date.now() - payload.ts > STATE_TTL_MS) return null;
  if (Date.now() < payload.ts - 60_000) return null; // clock skew guard

  return payload;
}

function hmac(input: string): string {
  return crypto.createHmac('sha256', env.BETTER_AUTH_SECRET).update(input).digest('base64url');
}
