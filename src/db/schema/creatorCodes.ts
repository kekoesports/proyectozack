import { pgTable, serial, integer, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { talents } from './talents';

export const creatorCodes = pgTable('creator_codes', {
  id: serial('id').primaryKey(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 100 }).notNull(),
  brandName: varchar('brand_name', { length: 150 }).notNull(),
  brandLogo: varchar('brand_logo', { length: 500 }),
  redirectUrl: text('redirect_url').notNull(),
  description: varchar('description', { length: 300 }),
  badge: varchar('badge', { length: 50 }),
  isFeatured: boolean('is_featured').notNull().default(false),
  category: varchar('category', { length: 50 }),
  ctaText: varchar('cta_text', { length: 100 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('creator_codes_talent_id_idx').on(t.talentId),
]);

export const creatorCodesRelations = relations(creatorCodes, ({ one }) => ({
  talent: one(talents, { fields: [creatorCodes.talentId], references: [talents.id] }),
}));
