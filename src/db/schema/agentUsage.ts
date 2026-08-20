import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { agentDefinitions } from './agentDefinitions';
import { agentUsageKindEnum } from './agentEnums';
import { agentRunSteps } from './agentRunSteps';
import { agentRuns } from './agentRuns';

/**
 * Ledger append-only de consumo. Es la base del presupuesto duro: sin un
 * registro por llamada no hay forma honesta de decir cuánto lleva gastado un
 * agente este mes.
 *
 * Cuando el proveedor no publica precio, `pricing_unknown` queda a `true` y el
 * coste a 0. Un coste inventado es peor que un hueco declarado: el hueco se ve
 * en el informe, la invención se suma.
 *
 * Ver docs/agent-os/data-model.md §11.
 */
export const agentUsageLedger = pgTable(
  'agent_usage_ledger',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => agentRuns.id, { onDelete: 'cascade' }),
    stepId: integer('step_id').references(() => agentRunSteps.id, { onDelete: 'set null' }),
    /** Denormalizado a propósito: el reporting por agente no debe hacer join. */
    agentId: integer('agent_id')
      .notNull()
      .references(() => agentDefinitions.id, { onDelete: 'restrict' }),
    kind: agentUsageKindEnum('kind').notNull(),
    provider: varchar('provider', { length: 40 }),
    model: varchar('model', { length: 120 }),
    inputTokens: bigint('input_tokens', { mode: 'number' }).notNull().default(0),
    outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0),
    cachedInputTokens: bigint('cached_input_tokens', { mode: 'number' }),
    estimatedCostMicros: bigint('estimated_cost_micros', { mode: 'number' }).notNull().default(0),
    /** `true` cuando no hay tarifa conocida para ese proveedor/modelo. */
    pricingUnknown: boolean('pricing_unknown').notNull().default(false),
    durationMs: integer('duration_ms'),
    usageJson: jsonb('usage_json').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('agent_usage_agent_occurred_idx').on(t.agentId, t.occurredAt),
    index('agent_usage_run_occurred_idx').on(t.runId, t.occurredAt),
    index('agent_usage_provider_model_idx').on(t.provider, t.model, t.occurredAt),
    check(
      'agent_usage_counters_ck',
      sql`${t.inputTokens} >= 0 AND ${t.outputTokens} >= 0 AND ${t.estimatedCostMicros} >= 0`,
    ),
  ],
);
