import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { crmBrands } from './crmBrands';
import { trackerParseModeEnum } from './trackerEnums';

export const brandSheetStatusEnum = pgEnum('brand_sheet_status', [
  'active',
  'paused',
  'error',
]);

export const brandSheetSources = pgTable(
  'brand_sheet_sources',
  {
    id: serial('id').primaryKey(),

    brandName: varchar('brand_name', { length: 200 }).notNull(),

    /** FK to crm_brands — nullable, set null on brand delete */
    crmBrandId: integer('crm_brand_id').references(() => crmBrands.id, { onDelete: 'set null' }),

    sourceTitle: varchar('source_title', { length: 300 }),

    googleSheetUrl: text('google_sheet_url').notNull(),
    spreadsheetId:  varchar('spreadsheet_id', { length: 100 }).notNull(),

    parseMode: trackerParseModeEnum('parse_mode').notNull().default('socialpro_blocks'),

    syncEnabled:   boolean('sync_enabled').notNull().default(false),
    lastScannedAt: timestamp('last_scanned_at', { withTimezone: true }),
    lastSyncedAt:  timestamp('last_synced_at',  { withTimezone: true }),

    status:       brandSheetStatusEnum('status').notNull().default('active'),
    errorMessage: text('error_message'),

    /**
     * Maps raw deliverable type strings from the sheet to canonical enum values.
     * Example: {"preroll":"stream_integration","video":"video_youtube"}
     */
    deliverableTypeMap: jsonb('deliverable_type_map').$type<Record<string, string>>(),

    /**
     * Maps talent name strings from the sheet to talent IDs in the DB.
     * Example: {"STAXX": 123, "TARIFA": 45}
     */
    talentNameMap: jsonb('talent_name_map').$type<Record<string, number>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('brand_sheet_sources_status_idx').on(t.status),
    index('brand_sheet_sources_crm_brand_idx').on(t.crmBrandId),
    index('brand_sheet_sources_created_idx').on(t.createdAt),
  ],
);

/**
 * Relations for brand_sheet_sources.
 * The `trackers` many-side is intentionally omitted here to avoid a circular
 * import cycle with dealDeliverableTrackers.ts — the FK lives on the tracker
 * side and the relation is declared there.
 */
export const brandSheetSourcesRelations = relations(brandSheetSources, ({ one }) => ({
  crmBrand: one(crmBrands, {
    fields: [brandSheetSources.crmBrandId],
    references: [crmBrands.id],
  }),
}));
