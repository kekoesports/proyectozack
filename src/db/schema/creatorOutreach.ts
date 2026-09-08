import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

export const creatorOutreachThreads = pgTable('creator_outreach_threads', {
  id: serial('id').primaryKey(),
  normalizedEmail: varchar('normalized_email', { length: 254 }).notNull(),
  replyToken: uuid('reply_token').notNull().defaultRandom(),
  unsubscribeToken: uuid('unsubscribe_token').notNull().defaultRandom(),
  status: varchar('status', { length: 32 }).notNull().default('draft'),
  subject: varchar('subject', { length: 200 }),
  firstContactAt: timestamp('first_contact_at', { withTimezone: true }),
  lastOutboundAt: timestamp('last_outbound_at', { withTimezone: true }),
  lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  reviewDecision: varchar('review_decision', { length: 16 }),
  qualificationReason: varchar('qualification_reason', { length: 500 }),
  internalNotes: text('internal_notes'),
  lastReplySummary: varchar('last_reply_summary', { length: 500 }),
  suggestedReply: text('suggested_reply'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('creator_outreach_threads_email_uniq').on(table.normalizedEmail),
  unique('creator_outreach_threads_reply_token_uniq').on(table.replyToken),
  unique('creator_outreach_threads_unsubscribe_token_uniq').on(table.unsubscribeToken),
  index('creator_outreach_threads_status_followup_idx').on(table.status, table.nextFollowUpAt),
]);

export const creatorOutreachSources = pgTable('creator_outreach_sources', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').notNull().references(() => creatorOutreachThreads.id, { onDelete: 'cascade' }),
  sourceType: varchar('source_type', { length: 32 }).notNull(),
  sourceId: integer('source_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('creator_outreach_sources_type_id_uniq').on(table.sourceType, table.sourceId),
  index('creator_outreach_sources_thread_idx').on(table.threadId),
]);

export const creatorOutreachMessages = pgTable('creator_outreach_messages', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').notNull().references(() => creatorOutreachThreads.id, { onDelete: 'cascade' }),
  direction: varchar('direction', { length: 12 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  providerEmailId: varchar('provider_email_id', { length: 100 }),
  internetMessageId: varchar('internet_message_id', { length: 500 }),
  idempotencyKey: uuid('idempotency_key'),
  subject: varchar('subject', { length: 200 }).notNull(),
  textBody: text('text_body').notNull(),
  actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('creator_outreach_messages_provider_id_uniq').on(table.providerEmailId),
  unique('creator_outreach_messages_idempotency_uniq').on(table.idempotencyKey),
  index('creator_outreach_messages_thread_date_idx').on(table.threadId, table.occurredAt),
]);

export type CreatorOutreachThread = typeof creatorOutreachThreads.$inferSelect;
export type CreatorOutreachMessage = typeof creatorOutreachMessages.$inferSelect;
