import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';

import { agentDefinitions, agentRuns } from '@/db/schema';
import { AgentRuntimeError } from '@/lib/agents/errors';
import { assertAgentsEnabled } from '@/lib/agents/runtime-flags';
import { db } from '@/lib/db';
import type { AgentRun } from '@/types';

/**
 * Repositorio de ejecuciones.
 *
 * PR 1 cubre encolar y consultar. El claim con `FOR UPDATE SKIP LOCKED`, los
 * leases y los reintentos llegan en PR 3: aquí no hay nada que ejecute nada.
 *
 * Ver docs/agent-os/data-model.md §4.
 */

export type EnqueueAgentRunInput = {
  readonly agentSlug: string;
  readonly triggerType: AgentRun['triggerType'];
  readonly correlationId: string;
  /** Input ya redactado por quien encola. Aquí no se redacta nada. */
  readonly inputJson?: Record<string, unknown>;
  readonly triggeredByUserId?: string | null;
  readonly parentRunId?: number | null;
  readonly sourceEventId?: number | null;
  readonly threadId?: number | null;
  readonly priority?: number;
  readonly idempotencyKey?: string | null;
  readonly scheduledFor?: Date | null;
  readonly availableAt?: Date;
  readonly maxAttempts?: number;
};

export type EnqueueAgentRunResult = {
  readonly run: AgentRun;
  /** `true` cuando la clave de idempotencia ya existía y se reutiliza. */
  readonly deduplicated: boolean;
};

/**
 * Encola una ejecución.
 *
 * Tres puertas antes de escribir, en este orden:
 *
 * 1. `AGENTS_ENABLED`. El kill switch global se comprueba en cada llamada, no
 *    al arrancar: apagarlo detiene el sistema sin desplegar.
 * 2. El agente existe y no está `disabled`. Un agente apagado no acumula cola
 *    que se dispararía de golpe al encenderlo.
 * 3. La clave de idempotencia. `ON CONFLICT DO NOTHING` deja que sea Postgres
 *    quien arbitre entre dos encolados simultáneos; el perdedor recupera la
 *    fila ganadora en vez de crear una segunda ejecución.
 */
export async function enqueueAgentRun(input: EnqueueAgentRunInput): Promise<EnqueueAgentRunResult> {
  assertAgentsEnabled();

  const [agent] = await db
    .select({ id: agentDefinitions.id, status: agentDefinitions.status })
    .from(agentDefinitions)
    .where(eq(agentDefinitions.slug, input.agentSlug))
    .limit(1);

  if (!agent) {
    throw new AgentRuntimeError('agent_not_found', `No existe el agente '${input.agentSlug}'.`);
  }
  if (agent.status === 'disabled') {
    throw new AgentRuntimeError(
      'agent_disabled',
      `El agente '${input.agentSlug}' está desactivado y no acepta ejecuciones.`,
    );
  }

  const values = {
    agentId: agent.id,
    triggerType: input.triggerType,
    triggeredByUserId: input.triggeredByUserId ?? null,
    parentRunId: input.parentRunId ?? null,
    sourceEventId: input.sourceEventId ?? null,
    threadId: input.threadId ?? null,
    correlationId: input.correlationId,
    inputJson: input.inputJson ?? {},
    priority: input.priority ?? 0,
    idempotencyKey: input.idempotencyKey ?? null,
    scheduledFor: input.scheduledFor ?? null,
    availableAt: input.availableAt ?? new Date(),
    maxAttempts: input.maxAttempts ?? 3,
  };

  const inserted = await db
    .insert(agentRuns)
    .values(values)
    .onConflictDoNothing({ target: agentRuns.idempotencyKey })
    .returning();

  const row = inserted[0];
  if (row) return { run: row, deduplicated: false };

  // Sin fila devuelta hay dos causas posibles y solo una es aceptable: que la
  // clave ya existiera. Si no hay clave, el conflicto no puede venir de ahí.
  if (!values.idempotencyKey) {
    throw new AgentRuntimeError('agent_invalid_input', 'No se pudo encolar la ejecución.');
  }

  const existing = await getAgentRunByIdempotencyKey(values.idempotencyKey);
  if (!existing) {
    throw new AgentRuntimeError('agent_invalid_input', 'No se pudo encolar ni recuperar la ejecución.');
  }
  return { run: existing, deduplicated: true };
}

export async function getAgentRunByIdempotencyKey(idempotencyKey: string): Promise<AgentRun | null> {
  const [row] = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.idempotencyKey, idempotencyKey))
    .limit(1);
  return row ?? null;
}

export async function getAgentRun(id: number): Promise<AgentRun | null> {
  const [row] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
  return row ?? null;
}

export type ListAgentRunsFilters = {
  readonly agentId?: number;
  readonly status?: AgentRun['status'];
  readonly limit?: number;
};

export async function listAgentRuns(filters: ListAgentRunsFilters = {}): Promise<readonly AgentRun[]> {
  const conditions = [
    filters.agentId !== undefined ? eq(agentRuns.agentId, filters.agentId) : undefined,
    filters.status !== undefined ? eq(agentRuns.status, filters.status) : undefined,
  ].filter((c) => c !== undefined);

  return db
    .select()
    .from(agentRuns)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(agentRuns.createdAt))
    .limit(Math.min(filters.limit ?? 50, 200));
}

/**
 * Marca la ejecución para que se detenga.
 *
 * La cancelación es cooperativa: el worker mira esta marca entre pasos. No
 * mata nada a mitad de una tool, que es justo lo que dejaría una escritura a
 * medias sin quién la reintente.
 */
export async function requestAgentRunCancellation(id: number): Promise<void> {
  await db
    .update(agentRuns)
    .set({ cancelRequestedAt: sql`coalesce(${agentRuns.cancelRequestedAt}, now())`, updatedAt: new Date() })
    .where(and(eq(agentRuns.id, id), sql`${agentRuns.completedAt} IS NULL`));
}
