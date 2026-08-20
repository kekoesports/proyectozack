import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { aiAssistantThreads } from './aiAssistant';
import { agentDefinitions } from './agentDefinitions';
import { agentEvents } from './agentEvents';
import { agentRunStatusEnum, agentTriggerTypeEnum } from './agentEnums';
import { user } from './auth';

/**
 * Unidad persistente de trabajo: una ejecución de un agente.
 *
 * La tabla es a la vez cola y estado. El worker reclama filas con
 * `FOR UPDATE SKIP LOCKED` y sostiene un lease (`lease_owner` +
 * `lease_expires_at`); si el proceso muere, el lease caduca y otro worker la
 * recupera sin perder los pasos ya escritos. El claim en sí llega en PR 3 —
 * aquí solo queda el soporte.
 *
 * Ver docs/agent-os/data-model.md §4.
 */
export const agentRuns = pgTable(
  'agent_runs',
  {
    id: serial('id').primaryKey(),
    agentId: integer('agent_id')
      .notNull()
      .references(() => agentDefinitions.id, { onDelete: 'restrict' }),
    triggerType: agentTriggerTypeEnum('trigger_type').notNull(),
    triggeredByUserId: text('triggered_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    /** Handoff entre agentes o subejecución. */
    parentRunId: integer('parent_run_id').references((): AnyPgColumn => agentRuns.id, { onDelete: 'set null' }),
    /** Evento que originó la ejecución. Lado único de la relación con `agent_events`. */
    sourceEventId: integer('source_event_id').references(() => agentEvents.id, { onDelete: 'set null' }),
    /** Puente opcional con el chat actual; nada en `/admin/asistente` depende de esto todavía. */
    threadId: integer('thread_id').references(() => aiAssistantThreads.id, { onDelete: 'set null' }),
    status: agentRunStatusEnum('status').notNull().default('queued'),
    priority: integer('priority').notNull().default(0),
    /** Deduplicación de encolado. Único cuando no es NULL. */
    idempotencyKey: varchar('idempotency_key', { length: 240 }),
    correlationId: varchar('correlation_id', { length: 80 }).notNull(),
    /** Input ya redactado por quien encola. */
    inputJson: jsonb('input_json').$type<Record<string, unknown>>().notNull().default({}),
    /** Resumen final legible, no el payload completo. */
    outputSummary: text('output_summary'),
    /** Checkpoint reanudable y versionado. */
    stateJson: jsonb('state_json').$type<Record<string, unknown>>().notNull().default({}),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    /** Ventana original del schedule, cuando el origen es una rutina. */
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Cancelación cooperativa: el worker la mira entre pasos. */
    cancelRequestedAt: timestamp('cancel_requested_at', { withTimezone: true }),
    attempt: integer('attempt').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    leaseOwner: varchar('lease_owner', { length: 120 }),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    nextStepSequence: integer('next_step_sequence').notNull().default(0),
    modelTurns: integer('model_turns').notNull().default(0),
    toolCalls: integer('tool_calls').notNull().default(0),
    inputTokens: bigint('input_tokens', { mode: 'number' }).notNull().default(0),
    outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0),
    estimatedCostMicros: bigint('estimated_cost_micros', { mode: 'number' }).notNull().default(0),
    lastErrorCode: varchar('last_error_code', { length: 100 }),
    /** Redactado y truncado antes de escribirse. */
    lastErrorMessage: text('last_error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('agent_runs_idempotency_key_uq')
      .on(t.idempotencyKey)
      .where(sql`idempotency_key IS NOT NULL`),
    // Índice de cola: solo las filas reclamables entran, así no crece con el
    // histórico de ejecuciones terminadas.
    index('agent_runs_claimable_idx')
      .on(t.status, t.availableAt, t.priority)
      .where(sql`status IN ('queued', 'retry_scheduled')`),
    index('agent_runs_agent_created_idx').on(t.agentId, t.createdAt),
    index('agent_runs_user_created_idx').on(t.triggeredByUserId, t.createdAt),
    index('agent_runs_source_event_idx').on(t.sourceEventId),
    // Recuperación de leases caducados tras la muerte de un worker.
    index('agent_runs_lease_idx').on(t.leaseExpiresAt).where(sql`status = 'running'`),
    index('agent_runs_correlation_idx').on(t.correlationId),
    check('agent_runs_attempt_ck', sql`${t.attempt} >= 0 AND ${t.attempt} <= ${t.maxAttempts}`),
    check('agent_runs_max_attempts_ck', sql`${t.maxAttempts} > 0`),
    check(
      'agent_runs_counters_ck',
      sql`${t.modelTurns} >= 0 AND ${t.toolCalls} >= 0 AND ${t.inputTokens} >= 0 AND ${t.outputTokens} >= 0 AND ${t.estimatedCostMicros} >= 0 AND ${t.nextStepSequence} >= 0`,
    ),
    // Un estado terminal sin `completed_at` deja la ejecución fuera de todo
    // informe de duración y la hace indistinguible de una colgada.
    check(
      'agent_runs_terminal_completed_ck',
      sql`${t.status} NOT IN ('succeeded', 'failed', 'cancelled', 'budget_blocked', 'dead_letter') OR ${t.completedAt} IS NOT NULL`,
    ),
    // `running` sin lease es una ejecución que nadie puede recuperar.
    check(
      'agent_runs_running_lease_ck',
      sql`${t.status} <> 'running' OR (${t.leaseOwner} IS NOT NULL AND ${t.leaseExpiresAt} IS NOT NULL)`,
    ),
    // Esperar aprobación no puede retener un lease: el run vuelve a la cola.
    check(
      'agent_runs_waiting_no_lease_ck',
      sql`${t.status} <> 'waiting_approval' OR ${t.leaseOwner} IS NULL`,
    ),
  ],
);
