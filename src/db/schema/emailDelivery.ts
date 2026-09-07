import { index, pgTable, serial, timestamp, unique, varchar } from 'drizzle-orm/pg-core';

/** Eventos mínimos de entrega. No almacena asunto, contenido, IP ni cabeceras. */
export const emailDeliveryEvents = pgTable('email_delivery_events', {
  id:             serial('id').primaryKey(),
  svixId:         varchar('svix_id', { length: 100 }).notNull(),
  resendEmailId:  varchar('resend_email_id', { length: 100 }).notNull(),
  eventType:      varchar('event_type', { length: 40 }).notNull(),
  eventCreatedAt: timestamp('event_created_at', { withTimezone: true }).notNull(),
  receivedAt:     timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('email_delivery_events_svix_id_uniq').on(table.svixId),
  index('email_delivery_events_email_idx').on(table.resendEmailId),
  index('email_delivery_events_type_created_idx').on(table.eventType, table.eventCreatedAt),
]);

/**
 * Lista interna de exclusión. La baja voluntaria sigue viviendo en
 * newsletter_subscribers; aquí solo entran problemas de entregabilidad.
 */
export const emailSuppressions = pgTable('email_suppressions', {
  id:            serial('id').primaryKey(),
  email:         varchar('email', { length: 254 }).notNull(),
  reason:        varchar('reason', { length: 32 }).notNull(),
  sourceEmailId: varchar('source_email_id', { length: 100 }).notNull(),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('email_suppressions_email_uniq').on(table.email),
  index('email_suppressions_reason_idx').on(table.reason),
]);

export type EmailSuppression = typeof emailSuppressions.$inferSelect;
