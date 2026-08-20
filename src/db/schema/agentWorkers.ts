import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

import { agentRuns } from './agentRuns';

/**
 * Latido de cada worker, para no depender de los logs para saber si el
 * execution plane está vivo.
 *
 * Los latidos viejos no se borran al arrancar: un histórico corto de
 * arranques y paradas es justo lo que hace falta para diagnosticar un
 * contenedor que se reinicia en bucle.
 *
 * Ver docs/agent-os/data-model.md §12.
 */
export const agentWorkerHeartbeats = pgTable(
  'agent_worker_heartbeats',
  {
    /** UUID generado al arrancar el proceso. */
    workerId: varchar('worker_id', { length: 120 }).primaryKey(),
    /** SHA del commit desplegado. */
    version: varchar('version', { length: 80 }).notNull().default('unknown'),
    /** Nombre del host o contenedor. Nunca una IP pública. */
    hostname: varchar('hostname', { length: 160 }).notNull().default('unknown'),
    status: varchar('status', { length: 30 }).notNull().default('starting'),
    currentRunId: integer('current_run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
    /** Metadatos operativos. Sin secretos. */
    metadataJson: jsonb('metadata_json').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index('agent_worker_heartbeats_seen_idx').on(t.lastHeartbeatAt),
    index('agent_worker_heartbeats_status_idx').on(t.status, t.lastHeartbeatAt),
    check(
      'agent_worker_heartbeats_status_ck',
      sql`${t.status} IN ('starting', 'healthy', 'draining', 'stopped')`,
    ),
  ],
);
