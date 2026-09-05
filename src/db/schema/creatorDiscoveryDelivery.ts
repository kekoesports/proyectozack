import { date, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import type { CreatorObservation } from '@/lib/schemas/creator-search-profile';
import { creatorAccounts } from './creatorDiscoveryOperations';
import { creatorDiscoveryRuns } from './creatorDiscoveryRuns';

// Reservations are attempts, including failed/uncertain responses. Not provider billing.
export const creatorDailyApiUsage = pgTable('creator_daily_api_usage', {
  platform: varchar('platform', { length: 40 }).notNull(),
  bucketDay: date('bucket_day', { mode: 'string' }).notNull(),
  budgetKey: varchar('budget_key', { length: 150 }).notNull(),
  reservedRequests: integer('reserved_requests').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.platform, t.bucketDay, t.budgetKey] })]);

export const creatorAccountObservations = pgTable('creator_account_observations', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => creatorAccounts.id),
  runId: integer('run_id').notNull().references(() => creatorDiscoveryRuns.id),
  fields: jsonb('fields').$type<Record<string, CreatorObservation>>().notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex('creator_observation_account_run_key').on(t.accountId, t.runId),
  index('creator_observation_history_idx').on(t.accountId, t.observedAt)]);

export const creatorDigestOutbox = pgTable('creator_digest_outbox', {
  id: serial('id').primaryKey(),
  eventKey: varchar('event_key', { length: 120 }).notNull(),
  runId: integer('run_id').references(() => creatorDiscoveryRuns.id),
  content: text('content').notNull(),
  status: varchar('status', { length: 20 }).$type<'pending' | 'sending' | 'sent' | 'uncertain' | 'failed'>().notNull().default('pending'),
  channelId: varchar('channel_id', { length: 30 }).notNull(),
  guildId: varchar('guild_id', { length: 30 }).notNull(),
  messageId: varchar('message_id', { length: 30 }),
  nonce: varchar('nonce', { length: 25 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('creator_digest_event_key').on(t.eventKey), index('creator_digest_pending_idx').on(t.status, t.availableAt)]);
