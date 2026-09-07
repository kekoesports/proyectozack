import { index, integer, pgTable, serial, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import type { CreatorPlatform } from '@/lib/schemas/creator-search-profile';
import { creatorAccounts } from './creatorDiscoveryOperations';

export const creatorLiveAudienceSamples = pgTable('creator_live_audience_samples', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => creatorAccounts.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 20 }).$type<Extract<CreatorPlatform, 'twitch' | 'kick'>>().notNull(),
  categoryName: varchar('category_name', { length: 100 }).notNull(),
  viewerCount: integer('viewer_count'),
  streamStartedAt: timestamp('stream_started_at', { withTimezone: true }).notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  source: varchar('source', { length: 80 }).notNull(),
}, (table) => [
  uniqueIndex('creator_live_sample_account_observed_key').on(table.accountId, table.observedAt),
  index('creator_live_sample_account_window_idx').on(table.accountId, table.observedAt),
  index('creator_live_sample_expiry_idx').on(table.expiresAt),
]);
