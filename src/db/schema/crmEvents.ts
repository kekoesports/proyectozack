import { pgTable, serial, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const crmEvents = pgTable(
  'crm_events',
  {
    id:               serial('id').primaryKey(),
    title:            varchar('title', { length: 200 }).notNull(),
    description:      text('description'),
    startAt:          timestamp('start_at',  { withTimezone: true }).notNull(),
    endAt:            timestamp('end_at',    { withTimezone: true }),
    /** Array de userIds de los asistentes (incluye al creador). */
    attendees:        jsonb('attendees').$type<string[]>().notNull().default([]),
    createdByUserId:  text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('crm_events_start_idx').on(t.startAt),
    index('crm_events_creator_idx').on(t.createdByUserId),
  ],
);
