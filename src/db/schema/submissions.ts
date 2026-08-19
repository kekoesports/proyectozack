import { pgTable, serial, varchar, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Estado del lead en el pipeline comercial.
 * Nombre de enum prefijado (`lead_status`) porque el enum `status` ya existe
 * en la DB para talents — ver src/db/schema/talents.ts.
 */
export const leadStatusEnum = pgEnum('lead_status', [
  'nuevo',
  'contactado',
  'descartado',
  'ganado',
]);

export const contactSubmissions = pgTable('contact_submissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  type: varchar('type', { length: 50 }).notNull(),
  company: varchar('company', { length: 100 }),
  message: text('message').notNull(),
  // Brand-specific fields
  budget: varchar('budget', { length: 20 }),
  timeline: varchar('timeline', { length: 30 }),
  audience: varchar('audience', { length: 200 }),
  vertical: varchar('vertical', { length: 30 }),
  campaignType: varchar('campaign_type', { length: 50 }),
  // Creator-specific fields
  platform: varchar('platform', { length: 30 }),
  viewers: varchar('viewers', { length: 100 }),
  monetization: varchar('monetization', { length: 200 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  ipHash: varchar('ip_hash', { length: 64 }),
  // CRM (módulo leads)
  status: leadStatusEnum('status').notNull().default('nuevo'),
  assignedToId: text('assigned_to_id').references(() => user.id, { onDelete: 'set null' }),
  notes: text('notes'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
}, (t) => [
  index('contact_submissions_created_at_idx').on(t.createdAt),
  index('contact_submissions_ip_hash_idx').on(t.ipHash),
  index('contact_submissions_status_idx').on(t.status),
  index('contact_submissions_assigned_to_idx').on(t.assignedToId),
]);
