import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const alerts = pgTable(
  'crm_alerts',
  {
    id: serial('id').primaryKey(),

    // Tipo de alerta
    type: varchar('type', { length: 80 }).notNull(),
    // overdue_task | overdue_followup | campaign_expiring | campaign_expired
    // brand_payment_pending | influencer_payment_pending | influencer_stats_outdated

    // Contenido
    title:       varchar('title',       { length: 200 }).notNull(),
    description: text('description'),

    // Severidad y estado
    severity: varchar('severity', { length: 20 }).notNull().default('medium'),
    // low | medium | high | critical

    status: varchar('status', { length: 20 }).notNull().default('active'),
    // active | resolved | dismissed

    // Entidad relacionada
    relatedEntityType: varchar('related_entity_type', { length: 50 }),
    // task | brand | talent | campaign | followup
    relatedEntityId: integer('related_entity_id'),

    // Responsable
    assignedToUserId: text('assigned_to_user_id').references(() => user.id, { onDelete: 'set null' }),

    // Fechas
    dueDate:     date('due_date'),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt:  timestamp('resolved_at',  { withTimezone: true }),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    snoozedUntil: date('snoozed_until'),
    // Precise, per-user task notices. Legacy date-only snoozing remains unchanged.
    dedupeKey: varchar('dedupe_key', { length: 200 }),
    readAt: timestamp('read_at', { withTimezone: true }),
    snoozedUntilAt: timestamp('snoozed_until_at', { withTimezone: true }),
    presentedAt: timestamp('presented_at', { withTimezone: true }),
    deliveryToken: varchar('delivery_token', { length: 36 }),
    deliveryUntil: timestamp('delivery_until', { withTimezone: true }),

    // Metadata adicional (JSON)
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('crm_alerts_type_idx').on(t.type),
    index('crm_alerts_status_idx').on(t.status),
    index('crm_alerts_severity_idx').on(t.severity),
    index('crm_alerts_entity_idx').on(t.relatedEntityType, t.relatedEntityId),
    index('crm_alerts_assigned_idx').on(t.assignedToUserId),
    index('crm_alerts_due_idx').on(t.dueDate),
    uniqueIndex('crm_alerts_dedupe_key_unique').on(t.dedupeKey),
  ],
);
