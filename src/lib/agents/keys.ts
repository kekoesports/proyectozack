import { createHash } from 'node:crypto';

/**
 * Claves de deduplicación del runtime de agentes.
 *
 * Son funciones puras a propósito: la garantía de "esto no se procesa dos
 * veces" depende de que la misma señal produzca siempre la misma cadena, y eso
 * hay que poder probarlo sin base de datos. La unicidad la impone Postgres
 * (índices `agent_events_event_key_uq` y `agent_runs_idempotency_key_uq`);
 * aquí solo se construye la cadena que esos índices vigilan.
 */

/** Longitud de `agent_events.event_key`. */
export const EVENT_KEY_MAX_LENGTH = 320;
/** Longitud de `agent_runs.idempotency_key` y `agent_tool_calls.idempotency_key`. */
export const IDEMPOTENCY_KEY_MAX_LENGTH = 240;

const HASH_SUFFIX_LENGTH = 16;

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Recorta preservando unicidad.
 *
 * Truncar a secas convierte dos claves distintas con prefijo común en la
 * misma clave, y el índice único empezaría a descartar señales legítimas como
 * si fueran duplicados. Por eso lo que se recorta se sustituye por un trozo
 * del hash del original.
 */
function fitToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const suffix = `~${sha256Hex(value).slice(0, HASH_SUFFIX_LENGTH)}`;
  return value.slice(0, maxLength - suffix.length) + suffix;
}

/** Vocabulario controlado (source, eventType): se normaliza agresivamente. */
function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Identificadores ajenos: solo se recorta el espacio en blanco. Bajarlos a
 * minúsculas fusionaría IDs distintos de sistemas sensibles a mayúsculas.
 */
function normalizeIdentifier(value: string): string {
  return value.trim();
}

function assertNonEmpty(label: string, value: string): void {
  if (value.length === 0) throw new Error(`agent-keys: ${label} no puede estar vacío`);
}

/**
 * Clave de deduplicación de un evento entrante.
 *
 * Sin `externalId` la clave incorpora un digest del payload: dos alertas
 * idénticas del mismo origen se consideran la misma señal, que es justo lo que
 * evita abrir seis incidentes por el mismo servicio caído.
 */
export function buildAgentEventKey(input: {
  readonly source: string;
  readonly eventType: string;
  readonly externalId?: string | null;
  readonly payloadDigest?: string | null;
}): string {
  const source = normalizeToken(input.source);
  const eventType = normalizeToken(input.eventType);
  assertNonEmpty('source', source);
  assertNonEmpty('eventType', eventType);

  const externalId = input.externalId ? normalizeIdentifier(input.externalId) : '';
  const discriminator =
    externalId.length > 0
      ? externalId
      : `digest:${sha256Hex(input.payloadDigest ?? '').slice(0, 32)}`;

  return fitToLength(`${source}:${eventType}:${discriminator}`, EVENT_KEY_MAX_LENGTH);
}

/**
 * Clave de idempotencia de una ejecución. Las partes se unen con `:` y las
 * vacías se descartan, de modo que `['manual', '', 'x']` y `['manual', 'x']`
 * son la misma clave.
 */
export function buildRunIdempotencyKey(parts: readonly string[]): string {
  const clean = parts.map(normalizeIdentifier).filter((p) => p.length > 0);
  if (clean.length === 0) throw new Error('agent-keys: se necesita al menos una parte no vacía');
  return fitToLength(clean.join(':'), IDEMPOTENCY_KEY_MAX_LENGTH);
}

/**
 * Clave de una ventana de schedule.
 *
 * La ventana entra ya normalizada a ISO en UTC. Es lo que impide que dos
 * workers —o un reinicio a mitad de tick— materialicen la misma rutina dos
 * veces. Ver docs/agent-os/architecture.md §2.4.
 */
export function buildScheduleIdempotencyKey(scheduleSlug: string, windowStart: Date): string {
  const slug = normalizeToken(scheduleSlug);
  assertNonEmpty('scheduleSlug', slug);
  if (Number.isNaN(windowStart.getTime())) {
    throw new Error('agent-keys: la ventana del schedule no es una fecha válida');
  }
  return buildRunIdempotencyKey(['schedule', slug, windowStart.toISOString()]);
}
