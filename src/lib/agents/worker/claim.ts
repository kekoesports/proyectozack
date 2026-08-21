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
  const filas = extraerFilas<AgentRun>(resultado);
  return filas[0] ?? null;
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
