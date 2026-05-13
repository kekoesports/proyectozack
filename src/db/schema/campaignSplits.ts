import { pgTable, serial, integer, varchar, numeric, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { campaigns } from './campaigns';

export const SPLIT_PARTIES = ['pablo', 'alfonso', 'giuliano', 'stark'] as const;
export type SplitParty = typeof SPLIT_PARTIES[number];

export const campaignSplits = pgTable('campaign_splits', {
  id:         serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  party:      varchar('party', { length: 50 }).notNull(),
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('campaign_splits_campaign_idx').on(t.campaignId),
  unique('campaign_splits_campaign_party_uniq').on(t.campaignId, t.party),
]);
