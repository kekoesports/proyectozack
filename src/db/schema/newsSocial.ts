import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { posts } from './posts';

export const newsSocialChannels = pgTable('news_social_channels', {
  channel: varchar('channel', { length: 16, enum: ['x', 'instagram'] }).primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  startAt: timestamp('start_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  accountId: varchar('account_id', { length: 100 }),
  credentialFingerprint: varchar('credential_fingerprint', { length: 64 }),
  budgetMonth: varchar('budget_month', { length: 7 }),
  reservedCents: integer('reserved_cents').notNull().default(0),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastError: varchar('last_error', { length: 80 }),
});

export const newsSocialDeliveries = pgTable('news_social_deliveries', {
  id: serial('id').primaryKey(),
  // Preserve the receipt even when an editor removes the source article.
  postId: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
  channel: varchar('channel', { length: 16, enum: ['x', 'instagram'] }).notNull(),
  status: varchar('status', { length: 16, enum: ['pending', 'processing', 'publishing', 'published', 'blocked', 'uncertain', 'cancelled'] }).notNull().default('pending'),
  text: text('text').notNull(),
  articleUrl: text('article_url').notNull(),
  containerId: varchar('container_id', { length: 100 }),
  remoteId: varchar('remote_id', { length: 100 }),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  lastError: varchar('last_error', { length: 80 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('news_social_post_channel_uq').on(t.postId, t.channel),
  index('news_social_pending_idx').on(t.channel, t.status, t.nextAttemptAt),
]);
