import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';

import { env } from '@/lib/env';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';

/**
 * Autenticación de máquina para `/api/internal/agents/*`.
 *
 * Dos capas, y cada una responde a algo distinto:
 *
 * - **Bearer** (`AGENT_INTERNAL_TOKEN`): quién llama. Deliberadamente distinto
 *   de `AUTOMATION_API_TOKEN` — n8n y los collectors del VPS no comparten
 *   superficie ni rotación, así que filtrar uno no compromete al otro.
 * - **HMAC + marca de tiempo** (`AGENT_EVENT_HMAC_SECRET`): que el cuerpo no se
 *   ha tocado y que no es una petición vieja reenviada. Un bearer robado de un
 *   log permite reenviar la misma alerta mil veces; la firma con ventana
 *   temporal, no.
 *
 * Fail-closed: sin secreto configurado responde 503, nunca abre.
 */

export type AgentInternalAuthResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: 'missing-config' | 'unauthorized' | 'stale-timestamp' | 'bad-signature';
    };

const BEARER_PREFIX = 'Bearer ';

/** Ventana de replay. Cubre un desfase de reloj razonable y poco más. */
export const REPLAY_WINDOW_SECONDS = 300;

export const TIMESTAMP_HEADER = 'x-agent-timestamp';
export const SIGNATURE_HEADER = 'x-agent-signature';

/**
 * Firma esperada de un cuerpo.
 *
 * La marca de tiempo entra en el material firmado: si no, se podría reutilizar
 * una firma válida cambiando solo la cabecera de fecha y la ventana no
 * protegería de nada.
 */
export function computeEventSignature(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
}

function firmasIguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return nodeTimingSafeEqual(bufA, bufB);
}

/** Solo el bearer. Lo usa el heartbeat, que no lleva cuerpo firmado. */
export function verifyAgentInternalToken(req: Request): AgentInternalAuthResult {
  const esperado = env.AGENT_INTERNAL_TOKEN;
  if (!esperado) return { ok: false, reason: 'missing-config' };

  const cabecera = req.headers.get('authorization');
  if (!cabecera?.startsWith(BEARER_PREFIX)) return { ok: false, reason: 'unauthorized' };

  const presentado = cabecera.slice(BEARER_PREFIX.length).trim();
  if (!presentado) return { ok: false, reason: 'unauthorized' };

  return timingSafeEqual(presentado, esperado) ? { ok: true } : { ok: false, reason: 'unauthorized' };
}

/**
 * Bearer + firma + ventana de replay. Para la ingestión de eventos.
 *
 * El orden importa: primero el bearer, que es barato, y solo después el HMAC.
 * Calcular una firma para cada petición sin credencial sería trabajo regalado a
 * quien las envíe.
 */
export function verifyAgentEventRequest(
  req: Request,
  rawBody: string,
  ahora: Date = new Date(),
): AgentInternalAuthResult {
  const bearer = verifyAgentInternalToken(req);
  if (!bearer.ok) return bearer;

  const secreto = env.AGENT_EVENT_HMAC_SECRET;
  if (!secreto) return { ok: false, reason: 'missing-config' };

  const timestamp = req.headers.get(TIMESTAMP_HEADER);
  const firma = req.headers.get(SIGNATURE_HEADER);
  if (!timestamp || !firma) return { ok: false, reason: 'bad-signature' };

  const segundos = Number(timestamp);
  if (!Number.isFinite(segundos)) return { ok: false, reason: 'stale-timestamp' };

  // El valor absoluto cubre las dos direcciones: una petición del pasado es un
  // replay y una del futuro es un reloj mal puesto o un intento de alargar la
  // validez de una firma.
  const desfase = Math.abs(Math.floor(ahora.getTime() / 1000) - segundos);
  if (desfase > REPLAY_WINDOW_SECONDS) return { ok: false, reason: 'stale-timestamp' };

  const esperada = computeEventSignature(secreto, timestamp, rawBody);
  return firmasIguales(firma, esperada) ? { ok: true } : { ok: false, reason: 'bad-signature' };
}

/** Código HTTP de cada motivo. `missing-config` es 503: no está roto, falta configurarlo. */
export function statusForAuthReason(reason: Exclude<AgentInternalAuthResult, { ok: true }>['reason']): number {
  return reason === 'missing-config' ? 503 : 401;
}
