import 'server-only';

import { and, asc, eq, lte, sql } from 'drizzle-orm';

import { agentEvents } from '@/db/schema';
import { buildAgentEventKey } from '@/lib/agents/keys';
import { db } from '@/lib/db';
import type { AgentEvent } from '@/types';

/**
 * Inbox de señales externas.
 *
 * El dedupe no se decide en código: se construye `event_key` y el índice único
 * `agent_events_event_key_uq` arbitra. Diez reintentos del mismo webhook
 * escriben una fila y las otras nueve se reconocen como duplicados, sin
 * carrera posible entre dos peticiones simultáneas.
 *
 * Ver docs/agent-os/data-model.md §9.
 */

export type IngestAgentEventInput = {
  readonly source: string;
  readonly eventType: string;
  readonly externalId?: string | null;
  readonly severity?: AgentEvent['severity'];
  /** Ya validado con Zod y redactado por el endpoint. */
  readonly payloadJson?: Record<string, unknown>;
  readonly fingerprint?: string | null;
  readonly occurredAt?: Date;
  readonly availableAt?: Date;
};

export type IngestAgentEventResult = {
  readonly event: AgentEvent;
  /** `true` cuando la señal ya estaba registrada. */
  readonly deduplicated: boolean;
};

export async function ingestAgentEvent(input: IngestAgentEventInput): Promise<IngestAgentEventResult> {
  const payload = input.payloadJson ?? {};
  const eventKey = buildAgentEventKey({
    source: input.source,
    eventType: input.eventType,
    externalId: input.externalId ?? null,
    // Sin ID externo, el propio contenido distingue una señal de otra.
    payloadDigest: JSON.stringify(payload),
  });

  const inserted = await db
    .insert(agentEvents)
    .values({
      source: input.source,
      eventType: input.eventType,
      externalId: input.externalId ?? null,
      eventKey,
      severity: input.severity ?? 'info',
      payloadJson: payload,
      fingerprint: input.fingerprint ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      availableAt: input.availableAt ?? new Date(),
    })
    .onConflictDoNothing({ target: agentEvents.eventKey })
    .returning();

  const row = inserted[0];
  if (row) return { event: row, deduplicated: false };

  const existing = await getAgentEventByKey(eventKey);
  if (!existing) throw new Error('agent-events: conflicto sin fila previa recuperable');
  return { event: existing, deduplicated: true };
}

export async function getAgentEventByKey(eventKey: string): Promise<AgentEvent | null> {
  const [row] = await db.select().from(agentEvents).where(eq(agentEvents.eventKey, eventKey)).limit(1);
  return row ?? null;
}

export async function getAgentEvent(id: number): Promise<AgentEvent | null> {
  const [row] = await db.select().from(agentEvents).where(eq(agentEvents.id, id)).limit(1);
  return row ?? null;
}

/**
 * Señales pendientes de proceso. Solo lectura: el claim con lease es del
 * procesador de eventos (PR 3).
 */
export async function listPendingAgentEvents(limit = 50): Promise<readonly AgentEvent[]> {
  return db
    .select()
    .from(agentEvents)
    .where(and(eq(agentEvents.status, 'pending'), lte(agentEvents.availableAt, new Date())))
    .orderBy(asc(agentEvents.availableAt))
    .limit(Math.min(limit, 200));
}

/**
 * Cierra una señal. `ignored` es un desenlace legítimo y frecuente: la mayoría
 * de eventos no merecen una ejecución, y dejarlos en `pending` los convertiría
 * en una cola que crece sola.
 */
export async function markAgentEventProcessed(
  id: number,
  status: Extract<AgentEvent['status'], 'processed' | 'ignored' | 'dead_letter'>,
  lastError?: string | null,
): Promise<void> {
  await db
    .update(agentEvents)
    .set({
      status,
      processedAt: new Date(),
      claimedBy: null,
      claimExpiresAt: null,
      lastError: lastError ?? null,
      attempt: sql`${agentEvents.attempt} + 1`,
    })
    .where(eq(agentEvents.id, id));
}
