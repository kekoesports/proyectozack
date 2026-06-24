import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { campaigns } from './campaigns';
import { talents } from './talents';
import { user } from './auth';
import { deliverableTypeEnum } from './deliverables';

export const trackerStatusEnum = pgEnum('tracker_status', [
  'active',
  'review_pending',
  'approved',
  'paid',
  'cancelled',
]);

export const trackerSourceTypeEnum = pgEnum('tracker_source_type', [
  'csv_upload',
  'xlsx_upload',
  'google_sheet',
  'manual',
]);

export const trackerParseModeEnum = pgEnum('tracker_parse_mode', [
  'simple_columns',
  'socialpro_blocks',
]);

export const contentPlatformEnum = pgEnum('content_platform', [
  'twitch',
  'kick',
  'youtube',
  'instagram',
  'tiktok',
  'other',
]);

export const trackerItemStatusEnum = pgEnum('tracker_item_status', [
  'detected',
  'valid',
  'duplicate',
  'invalid',
  'approved',
  'rejected',
]);

export const dealDeliverableTrackers = pgTable(
  'deal_deliverable_trackers',
  {
    id: serial('id').primaryKey(),

    campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    talentId: integer('talent_id').references(() => talents.id, { onDelete: 'set null' }),

    brandName: varchar('brand_name', { length: 200 }).notNull(),
    dealName: varchar('deal_name', { length: 300 }).notNull(),

    deliverableType: deliverableTypeEnum('deliverable_type').notNull(),

    targetCount: integer('target_count').notNull(),
    currentCount: integer('current_count').notNull().default(0),

    status: trackerStatusEnum('status').notNull().default('active'),

    trackingSourceType: trackerSourceTypeEnum('tracking_source_type').notNull().default('manual'),
    sourceFileName: varchar('source_file_name', { length: 500 }),
    lastImportedAt: timestamp('last_imported_at', { withTimezone: true }),

    // ── Google Sheets — campos comunes ───────────────────────────────────────
    trackingSourceUrl:    text('tracking_source_url'),
    googleSpreadsheetId:  varchar('google_spreadsheet_id', { length: 100 }),
    googleSheetGid:       varchar('google_sheet_gid', { length: 20 }),
    syncEnabled:          boolean('sync_enabled').notNull().default(false),
    lastSyncedAt:         timestamp('last_synced_at', { withTimezone: true }),

    // ── Google Sheets — modo simple_columns ──────────────────────────────────
    linkColumn:           varchar('link_column', { length: 100 }),
    dateColumn:           varchar('date_column', { length: 100 }),
    notesColumn:          varchar('notes_column', { length: 100 }),

    // ── Google Sheets — modo socialpro_blocks ────────────────────────────────
    trackingParseMode:    trackerParseModeEnum('tracking_parse_mode').notNull().default('simple_columns'),
    googleSheetBlockTitle: varchar('google_sheet_block_title', { length: 500 }),
    googleSheetBlockIndex: integer('google_sheet_block_index'),
    googleSheetStartCol:  integer('google_sheet_start_col'),
    googleSheetHeaderRow: integer('google_sheet_header_row'),
    googleSheetLinkCol:   integer('google_sheet_link_col'),

    completedAt: timestamp('completed_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, { onDelete: 'set null' }),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('deal_trackers_campaign_idx').on(t.campaignId),
    index('deal_trackers_talent_idx').on(t.talentId),
    index('deal_trackers_status_idx').on(t.status),
    index('deal_trackers_created_idx').on(t.createdAt),
  ],
);

export const dealDeliverableItems = pgTable(
  'deal_deliverable_items',
  {
    id: serial('id').primaryKey(),

    trackerId: integer('tracker_id').notNull().references(() => dealDeliverableTrackers.id, { onDelete: 'cascade' }),

    sourceRowIndex: integer('source_row_index'),
    originalUrl: text('original_url').notNull(),
    normalizedUrl: text('normalized_url').notNull(),
    platform: contentPlatformEnum('platform').notNull().default('other'),

    contentDate: varchar('content_date', { length: 10 }),
    notes: text('notes'),

    status: trackerItemStatusEnum('status').notNull().default('detected'),

    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('deal_items_tracker_idx').on(t.trackerId),
    index('deal_items_status_idx').on(t.status),
    index('deal_items_normalized_url_idx').on(t.normalizedUrl),
  ],
);

export const dealDeliverableTrackersRelations = relations(dealDeliverableTrackers, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [dealDeliverableTrackers.campaignId], references: [campaigns.id] }),
  talent: one(talents, { fields: [dealDeliverableTrackers.talentId], references: [talents.id] }),
  reviewedBy: one(user, { fields: [dealDeliverableTrackers.reviewedByUserId], references: [user.id] }),
  items: many(dealDeliverableItems),
}));

export const dealDeliverableItemsRelations = relations(dealDeliverableItems, ({ one }) => ({
  tracker: one(dealDeliverableTrackers, { fields: [dealDeliverableItems.trackerId], references: [dealDeliverableTrackers.id] }),
  reviewedBy: one(user, { fields: [dealDeliverableItems.reviewedByUserId], references: [user.id] }),
}));
