import { pgTable, serial, varchar, text, integer, index, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { talents } from './talents';

export const caseStudies = pgTable('case_studies', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  brandName: varchar('brand_name', { length: 100 }).notNull(),
  title: text('title').notNull(),
  logoUrl: varchar('logo_url', { length: 500 }),
  sortOrder: integer('sort_order').notNull().default(0),
  reach: varchar('reach', { length: 50 }),
  engagementRate: varchar('engagement_rate', { length: 20 }),
  conversions: varchar('conversions', { length: 50 }),
  roiMultiplier: varchar('roi_multiplier', { length: 20 }),
  heroImageUrl: varchar('hero_image_url', { length: 500 }),
  excerpt: text('excerpt'),
  // GEO REC-05: campos para caso de estudio en profundidad
  spokespersonQuote: text('spokesperson_quote'),
  spokespersonName: varchar('spokesperson_name', { length: 200 }),
  spokespersonRole: varchar('spokesperson_role', { length: 200 }),
  campaignPeriod: varchar('campaign_period', { length: 100 }),
  keyTakeaways: text('key_takeaways'), // almacenado como líneas separadas por \n
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('case_studies_slug_idx').on(t.slug),
]);

export const caseBody = pgTable('case_body', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').notNull().references(() => caseStudies.id, { onDelete: 'cascade' }),
  paragraph: text('paragraph').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('case_body_case_id_idx').on(t.caseId),
]);

export const caseTags = pgTable('case_tags', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').notNull().references(() => caseStudies.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 100 }).notNull(),
}, (t) => [
  index('case_tags_case_id_idx').on(t.caseId),
]);

export const caseCreators = pgTable('case_creators', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').notNull().references(() => caseStudies.id, { onDelete: 'cascade' }),
  creatorName: varchar('creator_name', { length: 100 }).notNull(),
  talentId: integer('talent_id').references(() => talents.id, { onDelete: 'set null' }),
}, (t) => [
  index('case_creators_case_id_idx').on(t.caseId),
  index('case_creators_talent_id_idx').on(t.talentId),
]);

export const caseStudiesRelations = relations(caseStudies, ({ many }) => ({
  body: many(caseBody),
  tags: many(caseTags),
  creators: many(caseCreators),
}));

export const caseBodyRelations = relations(caseBody, ({ one }) => ({
  caseStudy: one(caseStudies, { fields: [caseBody.caseId], references: [caseStudies.id] }),
}));

export const caseTagsRelations = relations(caseTags, ({ one }) => ({
  caseStudy: one(caseStudies, { fields: [caseTags.caseId], references: [caseStudies.id] }),
}));

export const caseCreatorsRelations = relations(caseCreators, ({ one }) => ({
  caseStudy: one(caseStudies, { fields: [caseCreators.caseId], references: [caseStudies.id] }),
}));
