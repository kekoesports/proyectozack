import { pgTable, serial, text, integer, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

/**
 * Items canjeables por monedas (precio fijo, canje directo, sin azar).
 * category: skin | merch | gift
 */
export const shopItems = pgTable('shop_items', {
  id: serial('id').primaryKey(),
  category: varchar('category', { length: 10 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  description: varchar('description', { length: 300 }),
  imageUrl: varchar('image_url', { length: 500 }),
  costCoins: integer('cost_coins').notNull(),
  stock: integer('stock').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('shop_items_active_category_idx').on(t.isActive, t.category),
]);

/** status: pendiente | enviado | cancelado */
export const redemptions = pgTable('redemptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  shopItemId: integer('shop_item_id').notNull().references(() => shopItems.id, { onDelete: 'restrict' }),
  costCoins: integer('cost_coins').notNull(),
  status: varchar('status', { length: 15 }).notNull().default('pendiente'),
  /** trade URL / dirección / email según la categoría del item, snapshot en el momento del canje */
  deliveryInfo: text('delivery_info'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('redemptions_user_id_idx').on(t.userId),
  index('redemptions_status_idx').on(t.status),
]);

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  user: one(user, { fields: [redemptions.userId], references: [user.id] }),
  shopItem: one(shopItems, { fields: [redemptions.shopItemId], references: [shopItems.id] }),
}));
