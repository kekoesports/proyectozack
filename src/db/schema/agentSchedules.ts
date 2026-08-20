import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { agentDefinitions } from './agentDefinitions';
import { agentScheduleCatchUpEnum } from './agentEnums';
import { agentRuns } from './agentRuns';
import { user } from './auth';

/**
 * Rutinas: la parte del sistema que actúa sin que nadie la invoque.
 *
 * Por eso `enabled` nace en `false` y ningún seed lo cambia. El scheduler
 * (PR 3) materializa cada ventana vencida en una ejecución con clave
 * idempotente `schedule:<slug>:<ventana ISO>`, de modo que dos workers o un
 * reinicio no producen ejecuciones duplicadas, y `catch_up_policy` acota
 * cuántas ventanas perdidas se recuperan tras una parada larga.
 *
 * La fila no guarda tokens, webhooks ni credenciales.
 *
 * Ver docs/agent-os/data-model.md §8.
 */
export const agentSchedules = pgTable(
  'agent_schedules',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 100 }).notNull(),
    agentId: integer('agent_id')
      .notNull()
      .references(() => agentDefinitions.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    /** Expresión cron validada en la capa de servicio antes de escribirse. */
    cronExpression: varchar('cron_expression', { length: 120 }).notNull(),
    timezone: varchar('timezone', { length: 80 }).notNull().default('Europe/Madrid'),
    /** Nace desactivada. Activar una rutina es una decisión humana explícita. */
    enabled: boolean('enabled').notNull().default(false),
    catchUpPolicy: agentScheduleCatchUpEnum('catch_up_policy').notNull().default('skip'),
    maxCatchUpRuns: integer('max_catch_up_runs').notNull().default(1),
    inputJson: jsonb('input_json').$type<Record<string, unknown>>().notNull().default({}),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    /** Última ventana materializada; es lo que hace idempotente al scheduler. */
    lastScheduledFor: timestamp('last_scheduled_for', { withTimezone: true }),
    lastRunId: integer('last_run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('agent_schedules_slug_uq').on(t.slug),
    index('agent_schedules_due_idx').on(t.enabled, t.nextRunAt).where(sql`enabled = true`),
    index('agent_schedules_agent_idx').on(t.agentId, t.enabled),
    check('agent_schedules_catch_up_ck', sql`${t.maxCatchUpRuns} > 0`),
    // Una rutina activa sin próxima ventana nunca se dispararía y nadie lo notaría.
    check('agent_schedules_enabled_next_ck', sql`${t.enabled} = false OR ${t.nextRunAt} IS NOT NULL`),
  ],
);
