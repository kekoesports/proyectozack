import { env } from '@/lib/env';

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const JWT_RE = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;
// PAN: 13-19 dígitos consecutivos. Luhn check decide redacción.
const POSSIBLE_PAN_RE = /\b\d{13,19}\b/g;
// Móvil/fijo ES (9 dígitos empezando 6/7/8/9, opcional prefijo +34/0034). Boundary
// `(?<![\d.-])` evita capturar fragmentos dentro de IDs/UUIDs/secuencias largas.
const PHONE_ES_RE = /(?<![\d.-])(?:(?:\+|00)34[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{3}(?![\d.-])/g;
// E.164 genérico: +<country><number>, 8-15 dígitos. Más estricto que ES.
const PHONE_E164_RE = /(?<!\d)\+\d{8,15}(?!\d)/g;

const ENV_VALUE_TO_KEY = buildEnvValueMap();

function buildEnvValueMap(): ReadonlyArray<readonly [string, string]> {
  const entries: Array<[string, string]> = [];
  // `env` tiene tipo `Readonly<{...}>`; iteramos sobre sus values con runtime-only checks.
  for (const [key, value] of Object.entries(env as Record<string, unknown>)) {
    if (typeof value === 'string' && value.length >= 8) {
      entries.push([value, key]);
    }
  }
  // Orden descendente por longitud — substrings largas se redactan primero
  // para evitar que una substring corta de otro env value se reemplace antes.
  entries.sort((a, b) => b[0].length - a[0].length);
  return entries;
}

function luhn(s: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (ch === undefined) return false;
    const n = parseInt(ch, 10);
    if (Number.isNaN(n)) return false;
    let v = n;
    if (alt) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function redactString(s: string): string {
  let out = s;
  // Env values exact match (cualquier valor, primero — antes que regex que podrían comer parte)
  for (const [value, key] of ENV_VALUE_TO_KEY) {
    if (out.includes(value)) out = out.split(value).join(`[REDACTED_ENV:${key}]`);
  }
  out = out.replace(JWT_RE, '[REDACTED_JWT]');
  out = out.replace(EMAIL_RE, '[REDACTED_EMAIL]');
  out = out.replace(POSSIBLE_PAN_RE, (m) => (luhn(m) ? '[REDACTED_PAN]' : m));
  out = out.replace(PHONE_E164_RE, '[REDACTED_PHONE]');
  out = out.replace(PHONE_ES_RE, '[REDACTED_PHONE]');
  return out;
}

/**
 * Redacta PII en cualquier valor: strings (regex + env match), arrays y
 * objetos planos (recursivo, con detección de ciclos). Tipos primitivos
 * no-string se devuelven tal cual.
 *
 * Patrones redactados: email, JWT, PAN (Luhn-valid), teléfono E.164/ES,
 * valores exactos de `env` (sustituidos por `[REDACTED_ENV:<KEY>]`).
 *
 * No redacta UUIDs (son IDs públicos en este repo).
 */
export function redactPII(value: unknown): unknown {
  return redactInner(value, new WeakSet<object>());
}

function redactInner(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[Circular]';
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((v) => redactInner(v, seen));
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactInner(value.message, seen),
      stack: typeof value.stack === 'string' ? redactInner(value.stack, seen) : undefined,
    };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = redactInner(v, seen);
  }
  return out;
}

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * Wrapper sobre `console[level]` que redacta el mensaje y los args via
 * `redactPII` antes de imprimir. Sustituto canónico de `console.*` en
 * código que pueda tocar PII.
 */
export function logRedacted(level: LogLevel, message: string, ...args: unknown[]): void {
  const safeMessage = redactString(message);
  const safeArgs = args.map((a) => redactPII(a));
  console[level](safeMessage, ...safeArgs);
}
