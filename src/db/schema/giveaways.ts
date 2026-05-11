import { pgTable, serial, integer, varchar, text, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { talents } from './talents';

export const giveaways = pgTable('giveaways', {
  id: serial('id').primaryKey(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  brandName: varchar('brand_name', { length: 150 }).notNull(),
  brandLogo: varchar('brand_logo', { length: 500 }),
  value: varchar('value', { length: 50 }),
  redirectUrl: text('redirect_url').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  isFeatured: boolean('is_featured').notNull().default(false),
  badge: varchar('badge', { length: 50 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('giveaways_talent_id_idx').on(t.talentId),
  index('giveaways_ends_at_idx').on(t.endsAt),
  index('giveaways_featured_sort_ends_idx').on(t.isFeatured, t.sortOrder, t.endsAt),
]);

export const giveawaysRelations = relations(giveaways, ({ one }) => ({
  talent: one(talents, { fields: [giveaways.talentId], references: [talents.id] }),
}));
