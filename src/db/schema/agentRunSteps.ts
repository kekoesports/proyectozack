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

import { agentStepStatusEnum, agentStepTypeEnum } from './agentEnums';
import { agentRuns } from './agentRuns';

/**
 * Timeline de una ejecución. Se escribe hacia delante y no se reescribe:
 * completar el paso en curso está permitido, borrar un fallo para que la
 * ejecución "quede bonita" no. Es el registro que hace auditable al agente.
 *
 * Ver docs/agent-os/data-model.md §5.
 */
export const agentRunSteps = pgTable(
  'agent_run_steps',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => agentRuns.id, { onDelete: 'cascade' }),
    /** Posición dentro de la ejecución. Única por run: no hay dos pasos 7. */
    sequence: integer('sequence').notNull(),
    stepType: agentStepTypeEnum('step_type').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    status: agentStepStatusEnum('status').notNull().default('pending'),
    inputJson: jsonb('input_json').$type<Record<string, unknown>>(),
    outputJson: jsonb('output_json').$type<Record<string, unknown>>(),
    provider: varchar('provider', { length: 40 }),
    model: varchar('model', { length: 120 }),
    inputTokens: bigint('input_tokens', { mode: 'number' }).notNull().default(0),
    outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0),
    estimatedCostMicros: bigint('estimated_cost_micros', { mode: 'number' }).notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('agent_run_steps_run_sequence_uq').on(t.runId, t.sequence),
    index('agent_run_steps_run_created_idx').on(t.runId, t.createdAt),
    index('agent_run_steps_status_idx').on(t.status, t.createdAt),
    check('agent_run_steps_sequence_ck', sql`${t.sequence} >= 0`),
    check(
      'agent_run_steps_counters_ck',
      sql`${t.inputTokens} >= 0 AND ${t.outputTokens} >= 0 AND ${t.estimatedCostMicros} >= 0`,
    ),
  ],
);
