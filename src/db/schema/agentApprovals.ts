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

import { agentActionClassEnum, agentApprovalStatusEnum } from './agentEnums';
import { agentRuns } from './agentRuns';
import { agentToolCalls } from './agentToolCalls';
import { user } from './auth';

/**
 * Autorización humana exacta, con caducidad y de un solo uso.
 *
 * Tres reglas sostienen la garantía y las tres viven en el schema:
 *
 * 1. `action_hash` fija la acción aprobada. Si cambia el input, la versión de
 *    la tool o la política, hace falta una aprobación nueva.
 * 2. `agent_approvals_pending_hash_uq` impide dos pendientes equivalentes.
 * 3. `expires_at` es obligatorio y posterior a `requested_at`.
 *
 * El consumo (`status = 'consumed'`) se hace con un
 * `UPDATE ... WHERE status = 'approved'` dentro de la misma transacción que
 * ejecuta la acción, para que un doble clic no ejecute dos veces.
 *
 * Los campos `required_permission_*` son un snapshot de la política vigente
 * cuando se pidió: sirven para auditar, no para autorizar. El permiso se
 * revalida contra el CRM en el momento de ejecutar.
 *
 * Ver docs/agent-os/data-model.md §7.
 */
export const agentApprovals = pgTable(
  'agent_approvals',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => agentRuns.id, { onDelete: 'cascade' }),
    toolCallId: integer('tool_call_id')
      .notNull()
      .references(() => agentToolCalls.id, { onDelete: 'cascade' }),
    actionHash: varchar('action_hash', { length: 64 }).notNull(),
    actionClass: agentActionClassEnum('action_class').notNull(),
    riskLevel: varchar('risk_level', { length: 20 }).notNull().default('medium'),
    title: varchar('title', { length: 200 }).notNull(),
    /** Resumen redactado de lo que se va a hacer, en lenguaje humano. */
    summary: text('summary').notNull().default(''),
    parametersPreviewJson: jsonb('parameters_preview_json').$type<Record<string, unknown>>().notNull().default({}),
    status: agentApprovalStatusEnum('status').notNull().default('pending'),
    /** Snapshot del módulo RBAC exigido. Auditoría, no autorización. */
    requiredPermissionModule: varchar('required_permission_module', { length: 80 }),
    requiredPermissionAction: varchar('required_permission_action', { length: 80 }),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedByUserId: text('decided_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    decisionNote: text('decision_note'),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Una única solicitud viva por tool call.
    uniqueIndex('agent_approvals_tool_call_uq').on(t.toolCallId),
    // El data-model pedía UNIQUE (action_hash, status). Literalmente prohibiría
    // dos rechazos con el mismo hash, que es legítimo; lo que hay que evitar son
    // dos PENDIENTES equivalentes, y eso es exactamente un índice parcial.
    uniqueIndex('agent_approvals_pending_hash_uq')
      .on(t.actionHash)
      .where(sql`status = 'pending'`),
    index('agent_approvals_status_expiry_idx').on(t.status, t.expiresAt),
    index('agent_approvals_decider_idx').on(t.decidedByUserId, t.decidedAt),
    index('agent_approvals_run_idx').on(t.runId, t.createdAt),
    check('agent_approvals_action_hash_ck', sql`char_length(${t.actionHash}) = 64`),
    check('agent_approvals_expiry_ck', sql`${t.expiresAt} > ${t.requestedAt}`),
    check('agent_approvals_risk_ck', sql`${t.riskLevel} IN ('low', 'medium', 'high', 'critical')`),
    // Nada aprobable puede ser `forbidden`: esa clase no tiene ruta de escape.
    check('agent_approvals_not_forbidden_ck', sql`${t.actionClass} <> 'forbidden'`),
    // Una decisión sin decisor ni fecha no es auditable.
    check(
      'agent_approvals_decided_ck',
      sql`${t.status} NOT IN ('approved', 'rejected') OR (${t.decidedAt} IS NOT NULL AND ${t.decidedByUserId} IS NOT NULL)`,
    ),
    check('agent_approvals_consumed_ck', sql`${t.status} <> 'consumed' OR ${t.consumedAt} IS NOT NULL`),
  ],
);
