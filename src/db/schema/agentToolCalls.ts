import { sql } from 'drizzle-orm';
import {
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

import { agentActionClassEnum, agentToolCallStatusEnum } from './agentEnums';
import { agentRunSteps } from './agentRunSteps';
import { agentRuns } from './agentRuns';

/**
 * Registro canónico de lo que el modelo pidió y de lo que realmente se ejecutó.
 *
 * Una propuesta (`proposed`) no es una ejecución. Entre ambas hay allowlist,
 * permiso, presupuesto, validación Zod y —para acciones con efecto externo o
 * privilegio— una aprobación humana ligada a `input_hash`. Cambiar un solo
 * argumento cambia el hash y anula la aprobación.
 *
 * Desviación deliberada de docs/agent-os/data-model.md §6: sin columna
 * `approval_id`. El propio data-model la marcaba como "se añade después" y
 * tenerla aquí crearía un ciclo con `agent_approvals`, que ya apunta a esta
 * tabla con un UNIQUE. La relación se lee desde ese lado.
 */
export const agentToolCalls = pgTable(
  'agent_tool_calls',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => agentRuns.id, { onDelete: 'cascade' }),
    stepId: integer('step_id').references(() => agentRunSteps.id, { onDelete: 'set null' }),
    /** Identificador de tool call que devuelve el proveedor del modelo. */
    providerCallId: varchar('provider_call_id', { length: 160 }),
    toolName: varchar('tool_name', { length: 160 }).notNull(),
    /** Congela la semántica: una tool v2 no hereda aprobaciones de la v1. */
    toolVersion: varchar('tool_version', { length: 80 }).notNull(),
    actionClass: agentActionClassEnum('action_class').notNull(),
    status: agentToolCallStatusEnum('status').notNull().default('proposed'),
    /** Input redactado por el redactor propio de la tool. */
    inputJson: jsonb('input_json').$type<Record<string, unknown>>().notNull().default({}),
    /** SHA-256 en hex del JSON canónico del input. */
    inputHash: varchar('input_hash', { length: 64 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 240 }),
    resultJson: jsonb('result_json').$type<Record<string, unknown>>(),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    proposedAt: timestamp('proposed_at', { withTimezone: true }).notNull().defaultNow(),
    executedAt: timestamp('executed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('agent_tool_calls_idempotency_key_uq')
      .on(t.idempotencyKey)
      .where(sql`idempotency_key IS NOT NULL`),
    index('agent_tool_calls_run_created_idx').on(t.runId, t.createdAt),
    index('agent_tool_calls_tool_created_idx').on(t.toolName, t.createdAt),
    index('agent_tool_calls_status_idx').on(t.status, t.createdAt),
    check('agent_tool_calls_input_hash_ck', sql`char_length(${t.inputHash}) = 64`),
  ],
);
