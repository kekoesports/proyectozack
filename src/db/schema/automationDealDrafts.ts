import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { campaigns } from './campaigns';

export const automationDealDrafts = pgTable(
  'automation_deal_drafts',
  {
    id: serial('id').primaryKey(),
    source: varchar('source', { length: 40 }).notNull().default('discord'),
    externalId: varchar('external_id', { length: 160 }).notNull(),
    sourceUserId: varchar('source_user_id', { length: 80 }),
    sourceChannelId: varchar('source_channel_id', { length: 80 }),
    rawText: text('raw_text').notNull(),
    proposedDeal: jsonb('proposed_deal').$type<unknown>().notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending_review'),
    campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    reviewedBy: varchar('reviewed_by', { length: 100 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    /** Resultado exacto de compartir la Sheet al aprobar el borrador. */
    sheetShareStatus: varchar('sheet_share_status', { length: 20 }),
    /** ACK de n8n después de publicar la confirmación en Discord. */
    discordNotifiedAt: timestamp('discord_notified_at', { withTimezone: true }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('automation_deal_drafts_status_idx').on(table.status),
    index('automation_deal_drafts_campaign_idx').on(table.campaignId),
    uniqueIndex('automation_deal_drafts_source_external_uq')
      .on(table.source, table.externalId)
      .where(sql`external_id IS NOT NULL`),
  ],
);

export const automationDealDraftsRelations = relations(automationDealDrafts, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [automationDealDrafts.campaignId],
    references: [campaigns.id],
  }),
}));
