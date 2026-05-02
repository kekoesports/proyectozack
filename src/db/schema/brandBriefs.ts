// ── Tipo del contenido estructurado ──────────────────────────────────

export type BriefContent = {
  description?:           string | null;
  productType?:           string | null;
  targetGeo?:             string | null;
  targetAudience?:        string | null;
  mainMessage?:           string | null;
  callToAction?:          string | null;
  mainLink?:              string | null;
  affiliateCode?:         string | null;
  influencerGuidelines?:  string | null;
  restrictions?:          string | null;
  legalNotes?:            string | null;
  contentNotes?:          string | null;
};

// ── Schema ────────────────────────────────────────────────────────────

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { crmBrands } from './crmBrands';
import { user } from './auth';

export const brandBriefs = pgTable(
  'brand_briefs',
  {
    id:                serial('id').primaryKey(),
    brandId:           integer('brand_id').notNull().references(() => crmBrands.id, { onDelete: 'cascade' }),

    name:              varchar('name',    { length: 200 }).notNull(),
    version:           varchar('version', { length: 20  }).notNull().default('v1'),
    geo:               varchar('geo',     { length: 80  }),
    status:            varchar('status',  { length: 30  }).notNull().default('pending_review'),
    // pending_review | approved | archived

    sourceFileUrl:     text('source_file_url'),
    sourceFilePath:    text('source_file_path'),
    sourceFileName:    varchar('source_file_name', { length: 260 }),
    sourceFileMime:    varchar('source_file_mime', { length: 100 }),

    extractedData:     jsonb('extracted_data').$type<Record<string, unknown>>(),
    rawText:           text('raw_text'),

    // Contenido estructurado del brief (formulario editable)
    briefContent:      jsonb('brief_content').$type<BriefContent>(),

    notes:             text('notes'),

    createdByUserId:   text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    reviewedByUserId:  text('reviewed_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    reviewedAt:        timestamp('reviewed_at', { withTimezone: true }),

    createdAt:         timestamp('created_at',  { withTimezone: true }).notNull().defaultNow(),
    updatedAt:         timestamp('updated_at',  { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('brand_briefs_brand_idx').on(t.brandId),
    index('brand_briefs_status_idx').on(t.status),
  ],
);

export const brandBriefsRelations = relations(brandBriefs, ({ one }) => ({
  brand:      one(crmBrands, { fields: [brandBriefs.brandId],          references: [crmBrands.id] }),
  createdBy:  one(user,      { fields: [brandBriefs.createdByUserId],   references: [user.id], relationName: 'briefCreator'  }),
  reviewedBy: one(user,      { fields: [brandBriefs.reviewedByUserId],  references: [user.id], relationName: 'briefReviewer' }),
}));
