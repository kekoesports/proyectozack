import 'server-only';

import { sql } from 'drizzle-orm';

import { agentEvents } from '@/db/schema';
import { db } from '@/lib/db';
import { enqueueAgentRun } from '@/lib/queries/agents/runs';
import { markAgentEventProcessed } from '@/lib/queries/agents/events';
import { logRedacted } from '@/lib/log';
import type { AgentEvent } from '@/types';

import { extraerFilas } from './claim';

/**
 * Convierte señales externas en ejecuciones, cuando procede.
 *
 * La decisión es **determinista**: una tabla de reglas mira origen, tipo y
 * severidad y dice si merece una ejecución. El modelo no participa en decidir
 * si algo es una incidencia — solo en interpretarla después.
 *
 * La mayoría de eventos acaban en `ignored`, y eso es lo normal. Dejarlos en
 * `pending` los convertiría en una cola que crece sola, y despertar a un agente
 * por cada latido de un health check gastaría el presupuesto del mes en un día.
 */

export type EventRule = {
  /** `*` casa con cualquier origen. */
  readonly source: string;
  /** `*` casa con cualquier tipo. */
  readonly eventType: string;
  readonly minSeverity: AgentEvent['severity'];
  readonly agentSlug: string;
};

const ORDEN_SEVERIDAD: Readonly<Record<AgentEvent['severity'], number>> = {
  info: 0,
  warning: 1,
  high: 2,
  critical: 3,
};

/**
 * Reglas iniciales.
 *
 * Solo `high` y `critical` despiertan a Guardian, y ningún otro agente tiene
 * disparadores por evento todavía. Ampliar esto es un PR, no una opción de la
 * UI: una regla mal puesta puede convertir un aviso repetido en cien
 * ejecuciones.
 */
export const EVENT_RULES: readonly EventRule[] = [
  { source: '*', eventType: '*', minSeverity: 'high', agentSlug: 'guardian' },
];

export function matchEventRule(evento: AgentEvent, reglas: readonly EventRule[] = EVENT_RULES): EventRule | null {
  const severidad = ORDEN_SEVERIDAD[evento.severity];
  for (const regla of reglas) {
    if (regla.source !== '*' && regla.source !== evento.source) continue;
    if (regla.eventType !== '*' && regla.eventType !== evento.eventType) continue;
    if (severidad < ORDEN_SEVERIDAD[regla.minSeverity]) continue;
    return regla;
  }
  return null;
}

export type EventProcessorResult = {
  readonly claimed: number;
  readonly runsCreated: number;
  readonly ignored: number;
  readonly failed: number;
};

/**
 * Reclama eventos pendientes con `FOR UPDATE SKIP LOCKED`.
 *
 * Mismo patrón que la cola de ejecuciones y por el mismo motivo: dos workers
 * mirando a la vez no deben procesar el mismo evento ni bloquearse.
 */
async function claimEvents(workerId: string, claimSeconds: number, limite: number): Promise<readonly AgentEvent[]> {
  const resultado = await db.execute(sql`
    WITH candidatos AS (
      SELECT ${agentEvents.id} AS id
      FROM ${agentEvents}
      WHERE ${agentEvents.status} = 'pending'
        AND ${agentEvents.availableAt} <= now()
        AND (${agentEvents.claimExpiresAt} IS NULL OR ${agentEvents.claimExpiresAt} < now())
      ORDER BY ${agentEvents.severity} DESC, ${agentEvents.availableAt} ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limite}
    )
    UPDATE ${agentEvents}
    SET status = 'claimed',
        claimed_by = ${workerId},
        claim_expires_at = now() + make_interval(secs => ${claimSeconds})
    FROM candidatos
    WHERE ${agentEvents.id} = candidatos.id
    RETURNING ${agentEvents}.*
  `);

  return extraerFilas<AgentEvent>(resultado);
}

export async function processPendingEvents(opts: {
  readonly workerId: string;
  readonly claimSeconds?: number;
  readonly limite?: number;
}): Promise<EventProcessorResult> {
  const eventos = await claimEvents(opts.workerId, opts.claimSeconds ?? 60, opts.limite ?? 10);

  let creadas = 0;
  let ignorados = 0;
  let fallidos = 0;

  for (const evento of eventos) {
    try {
      const regla = matchEventRule(evento);
      if (!regla) {
        await markAgentEventProcessed(evento.id, 'ignored');
        ignorados += 1;
        continue;
      }

      // La clave de idempotencia sale del `event_key`, que ya es único: un
      // evento no puede generar dos ejecuciones ni aunque se procese dos veces.
      const resultado = await enqueueAgentRun({
        agentSlug: regla.agentSlug,
        triggerType: 'event',
        correlationId: `event-${evento.id}`,
        idempotencyKey: `event:${evento.eventKey}`,
        sourceEventId: evento.id,
        priority: evento.severity === 'critical' ? 10 : 5,
        inputJson: {
          source: evento.source,
          eventType: evento.eventType,
          severity: evento.severity,
          fingerprint: evento.fingerprint,
          // El payload ya viene validado y redactado del ingestor. Aun así el
          // agente lo tratará como dato no confiable.
          payload: evento.payloadJson,
        },
      });

      if (!resultado.deduplicated) creadas += 1;
      await markAgentEventProcessed(evento.id, 'processed');
    } catch (err) {
      // Un agente desactivado o un fallo puntual no debe dejar el evento
      // colgado en `claimed`: se marca y se anota por qué.
      logRedacted('warn', `[agents] evento ${evento.id} no procesado:`, err);
      await markAgentEventProcessed(
        evento.id,
        'dead_letter',
        err instanceof Error ? err.message.slice(0, 300) : 'error desconocido',
      );
      fallidos += 1;
    }
  }

  return { claimed: eventos.length, runsCreated: creadas, ignored: ignorados, failed: fallidos };
}
