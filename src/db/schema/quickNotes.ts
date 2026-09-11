import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  boolean,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { crmTasks } from './crmTasks';

export const quickNotes = pgTable(
  'crm_quick_notes',
  {
    id: uuid('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    originalText: text('original_text').notNull(),
    body: text('body').notNull(),
    mode: text('mode').notNull().default('auto'),
    timezone: text('timezone').notNull().default('Europe/Madrid'),
    relatedType: text('related_type'),
    relatedId: integer('related_id'),
    version: integer('version').notNull().default(1),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('quick_notes_owner_updated_idx').on(t.ownerId, t.updatedAt)],
);

export const quickNoteShares = pgTable(
  'crm_quick_note_shares',
  {
    noteId: uuid('note_id')
      .notNull()
      .references(() => quickNotes.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.noteId, t.userId] }),
    index('quick_note_shares_user_idx').on(t.userId),
  ],
);

export const quickNoteConversions = pgTable(
  'crm_quick_note_conversions',
  {
    noteId: uuid('note_id')
      .primaryKey()
      .references(() => quickNotes.id, { onDelete: 'cascade' }),
    taskId: integer('task_id').references(() => crmTasks.id, {
      onDelete: 'set null',
    }),
    taskUpdatedAt: timestamp('task_updated_at', {
      withTimezone: true,
    }).notNull(),
    undoneAt: timestamp('undone_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('quick_note_conversion_task_unique').on(t.taskId)],
);

export const quickNoteEvents = pgTable(
  'crm_quick_note_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    noteId: uuid('note_id')
      .notNull()
      .references(() => quickNotes.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    kind: text('kind').notNull(),
    detail: jsonb('detail')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('quick_note_events_note_idx').on(t.noteId)],
);

export const taskNoticeSettings = pgTable('crm_task_notice_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('Europe/Madrid'),
  startHour: integer('start_hour').notNull().default(9),
  endHour: integer('end_hour').notNull().default(20),
  weekdaysOnly: boolean('weekdays_only').notNull().default(true),
});
