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

import { agentModeEnum, agentStatusEnum } from './agentEnums';

/**
 * Configuración operativa de cada agente.
 *
 * Los prompts y el código de las tools siguen versionados en Git; aquí solo
 * vive el estado que un humano puede cambiar en caliente —kill switch, modo,
 * límites y presupuesto— más punteros de versión a lo que sí está en el
 * repositorio (`prompt_version`, `policy_version`).
 *
 * `settings_json` NUNCA contiene secretos: las credenciales van por env y las
 * consume el proceso, no la fila. Ver docs/agent-os/data-model.md §3.
 */
export const agentDefinitions = pgTable(
  'agent_definitions',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull(),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    description: text('description').notNull().default(''),
    /** Kill switch por agente. Nace `disabled` y solo un humano lo activa. */
    status: agentStatusEnum('status').notNull().default('disabled'),
    /** Nace `shadow`: sin escrituras ni notificaciones externas. */
    mode: agentModeEnum('mode').notNull().default('shadow'),
    promptVersion: varchar('prompt_version', { length: 80 }).notNull().default('v0'),
    policyVersion: varchar('policy_version', { length: 80 }).notNull().default('v0'),
    modelProvider: varchar('model_provider', { length: 40 }).notNull().default('null'),
    modelName: varchar('model_name', { length: 120 }),
    maxConcurrentRuns: integer('max_concurrent_runs').notNull().default(1),
    maxRunsPerDay: integer('max_runs_per_day').notNull().default(24),
    /** Protección anti-loop: turnos de modelo por ejecución. */
    maxTurnsPerRun: integer('max_turns_per_run').notNull().default(8),
    /** Protección anti-loop: llamadas a tools por ejecución. */
    maxToolCallsPerRun: integer('max_tool_calls_per_run').notNull().default(16),
    maxDurationSeconds: integer('max_duration_seconds').notNull().default(600),
    /** Presupuesto mensual. 1 USD = 1.000.000 micros. */
    monthlyBudgetMicros: bigint('monthly_budget_micros', { mode: 'number' }).notNull().default(0),
    /** Solo ajustes no sensibles y validados por Zod antes de escribirse. */
    settingsJson: jsonb('settings_json').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('agent_definitions_slug_uq').on(t.slug),
    index('agent_definitions_status_idx').on(t.status, t.mode),
    check('agent_definitions_concurrency_ck', sql`${t.maxConcurrentRuns} > 0`),
    check('agent_definitions_runs_per_day_ck', sql`${t.maxRunsPerDay} > 0`),
    check('agent_definitions_turns_ck', sql`${t.maxTurnsPerRun} > 0`),
    check('agent_definitions_tool_calls_ck', sql`${t.maxToolCallsPerRun} > 0`),
    check('agent_definitions_duration_ck', sql`${t.maxDurationSeconds} > 0`),
    check('agent_definitions_budget_ck', sql`${t.monthlyBudgetMicros} >= 0`),
  ],
);
