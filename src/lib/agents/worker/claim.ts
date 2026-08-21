import 'server-only';

import { sql } from 'drizzle-orm';

import { agentRuns } from '@/db/schema';
import { getTransactionalDb } from '@/lib/db';
import type { AgentRun } from '@/types';

/**
 * Reclamar trabajo de la cola.
 *
 * El patrón es `FOR UPDATE SKIP LOCKED` dentro de una transacción: dos workers
 * que miran a la vez no se pelean por la misma fila ni se bloquean esperándose;
 * el segundo salta la fila bloqueada y coge la siguiente. Sin `SKIP LOCKED`, la
 * cola se serializa y el segundo worker no aporta nada.
 *
 * Un `UPDATE ... WHERE status = 'queued'` a secas no basta: entre el `SELECT`
 * que elige y el `UPDATE` que marca puede colarse otro worker. Aquí la fila se
 * bloquea en el mismo `SELECT` que la elige.
 *
 * Cuatro cosas se escriben en la MISMA sentencia que cambia el estado, porque
 * los CHECK de `agent_runs` no admiten el estado intermedio: `status`,
 * `lease_owner`, `lease_expires_at` y `attempt`.
 *
 * Ver docs/agent-os/architecture.md §2.3.
 */

export type ClaimAgentRunOptions = {
  readonly workerId: string;
  readonly leaseSeconds: number;
};

/**
 * Construye el SQL del claim.
 *
 * Separado de la ejecución para poder inspeccionarlo en un test sin base de
 * datos: en CI no hay Postgres, así que lo que se comprueba es que la sentencia
 * lleva `SKIP LOCKED`, el tope de intentos y el lease.
 */
export function buildClaimSql(opts: ClaimAgentRunOptions) {
  return sql`
    WITH candidata AS (
      SELECT ${agentRuns.id} AS id
      FROM ${agentRuns}
      WHERE ${agentRuns.status} IN ('queued', 'retry_scheduled')
        AND ${agentRuns.availableAt} <= now()
        AND ${agentRuns.cancelRequestedAt} IS NULL
        AND (${agentRuns.leaseExpiresAt} IS NULL OR ${agentRuns.leaseExpiresAt} < now())
        AND ${agentRuns.attempt} < ${agentRuns.maxAttempts}
      ORDER BY ${agentRuns.priority} DESC, ${agentRuns.availableAt} ASC, ${agentRuns.id} ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE ${agentRuns}
    SET status = 'running',
        lease_owner = ${opts.workerId},
        lease_expires_at = now() + make_interval(secs => ${opts.leaseSeconds}),
        attempt = ${agentRuns.attempt} + 1,
        started_at = coalesce(${agentRuns.startedAt}, now()),
        updated_at = now()
    FROM candidata
    WHERE ${agentRuns.id} = candidata.id
    RETURNING ${agentRuns}.*
  `;
}

/**
 * Reclama una ejecución, o `null` si no hay nada que hacer.
 *
 * `attempt < max_attempts` en el `WHERE` no es una optimización: el CHECK
 * `agent_runs_attempt_ck` exige `attempt <= max_attempts`, así que sin ese
 * filtro el intento que sobra reventaría contra la constraint en vez de
 * dejar la fila lista para dead-letter.
 */
export async function claimNextAgentRun(opts: ClaimAgentRunOptions): Promise<AgentRun | null> {
  const db = getTransactionalDb();
  const resultado = await db.execute(buildClaimSql(opts));
  const filas = extraerFilas<Record<string, unknown>>(resultado);
  const fila = filas[0];
  return fila ? mapAgentRunRow(fila) : null;
}

/**
 * Convierte una fila cruda de `agent_runs` al objeto que espera el resto del
 * runtime.
 *
 * Hace falta porque `db.execute()` con SQL escrito a mano devuelve las columnas
 * **tal como se llaman en Postgres** —`agent_id`, `max_attempts`—, no con los
 * nombres del schema TypeScript. El query builder de Drizzle sí hace esa
 * traducción; `execute` no.
 *
 * Sin esto, `run.agentId` era `undefined`, el worker no encontraba el agente,
 * devolvía la ejecución a la cola y volvía a intentarlo — subiendo `attempt`
 * en cada vuelta hasta agotar los intentos y dejarla atascada. Y el tipo de
 * retorno decía `AgentRun`, así que TypeScript no podía verlo: la firma
 * prometía una forma que el runtime no cumplía.
 *
 * Se descubrió ejecutando el worker contra la base de verdad. Ningún test lo
 * cogía porque todos mockean `db.execute` y devuelven ya el objeto en camelCase.
 */
export function mapAgentRunRow(fila: Record<string, unknown>): AgentRun {
  const fecha = (v: unknown): Date | null => {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const numero = (v: unknown): number => Number(v ?? 0);
  const texto = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
  const json = (v: unknown): Record<string, unknown> =>
    v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};

  return {
    id: numero(fila.id),
    agentId: numero(fila.agent_id),
    triggerType: String(fila.trigger_type) as AgentRun['triggerType'],
    triggeredByUserId: texto(fila.triggered_by_user_id),
    parentRunId: fila.parent_run_id === null || fila.parent_run_id === undefined ? null : numero(fila.parent_run_id),
    sourceEventId: fila.source_event_id === null || fila.source_event_id === undefined ? null : numero(fila.source_event_id),
    threadId: fila.thread_id === null || fila.thread_id === undefined ? null : numero(fila.thread_id),
    status: String(fila.status) as AgentRun['status'],
    priority: numero(fila.priority),
    idempotencyKey: texto(fila.idempotency_key),
    correlationId: String(fila.correlation_id ?? ''),
    inputJson: json(fila.input_json),
    outputSummary: texto(fila.output_summary),
    stateJson: json(fila.state_json),
    // `available_at` y `created_at` nunca son nulos en la tabla; el fallback
    // existe para no propagar un `null` si la fila viniera de otro sitio.
    availableAt: fecha(fila.available_at) ?? new Date(),
    scheduledFor: fecha(fila.scheduled_for),
    startedAt: fecha(fila.started_at),
    completedAt: fecha(fila.completed_at),
    cancelRequestedAt: fecha(fila.cancel_requested_at),
    attempt: numero(fila.attempt),
    maxAttempts: numero(fila.max_attempts),
    leaseOwner: texto(fila.lease_owner),
    leaseExpiresAt: fecha(fila.lease_expires_at),
    nextStepSequence: numero(fila.next_step_sequence),
    modelTurns: numero(fila.model_turns),
    toolCalls: numero(fila.tool_calls),
    inputTokens: numero(fila.input_tokens),
    outputTokens: numero(fila.output_tokens),
    estimatedCostMicros: numero(fila.estimated_cost_micros),
    lastErrorCode: texto(fila.last_error_code),
    lastErrorMessage: texto(fila.last_error_message),
    createdAt: fecha(fila.created_at) ?? new Date(),
    updatedAt: fecha(fila.updated_at) ?? new Date(),
  };
}

/**
 * Ejecuciones cuyo lease venció con el worker muerto.
 *
 * No las reclama: las devuelve a la cola. Que la recuperación pase por
 * `queued` en vez de saltar directamente a otro worker deja el rastro en la
 * timeline y hace que el reintento respete la prioridad como cualquier otro.
 */
export async function recoverExpiredLeases(limite = 20): Promise<number> {
  const db = getTransactionalDb();
  const resultado = await db.execute(sql`
    UPDATE ${agentRuns}
    SET status = 'queued',
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = 'lease_lost',
        updated_at = now()
    WHERE ${agentRuns.id} IN (
      SELECT ${agentRuns.id}
      FROM ${agentRuns}
      WHERE ${agentRuns.status} = 'running'
        AND ${agentRuns.leaseExpiresAt} < now()
      ORDER BY ${agentRuns.leaseExpiresAt} ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limite}
    )
    RETURNING ${agentRuns.id}
  `);
  return extraerFilas(resultado).length;
}

/**
 * Normaliza el resultado de `db.execute`.
 *
 * `neon-http` devuelve el array de filas directamente y `pg` lo devuelve en
 * `.rows`. El worker tiene que funcionar con los dos porque la migración al VPS
 * cambia el driver bajo los pies — ver `src/lib/db.ts`.
 */
export function extraerFilas<T = Record<string, unknown>>(resultado: unknown): readonly T[] {
  if (Array.isArray(resultado)) return resultado as readonly T[];
  if (resultado !== null && typeof resultado === 'object' && 'rows' in resultado) {
    const filas = (resultado as { rows?: unknown }).rows;
    if (Array.isArray(filas)) return filas as readonly T[];
  }
  return [];
}
