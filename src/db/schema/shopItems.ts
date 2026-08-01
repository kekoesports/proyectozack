import { pgTable, serial, text, integer, varchar, boolean, timestamp, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
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
  check('shop_items_cost_positive_ck', sql`${t.costCoins} > 0`),
  check('shop_items_stock_nonnegative_ck', sql`${t.stock} >= 0`),
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
  /** Token de la intención del cliente; evita duplicar un reintento de red. */
  requestKey: varchar('request_key', { length: 64 }),
  /** Datos operativos del backoffice, nunca expuestos en listados públicos. */
  processedBy: text('processed_by').references(() => user.id, { onDelete: 'set null' }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('redemptions_user_id_idx').on(t.userId),
  index('redemptions_status_idx').on(t.status),
  index('redemptions_processed_by_idx').on(t.processedBy),
  uniqueIndex('redemptions_request_key_uq').on(t.requestKey),
  check('redemptions_cost_positive_ck', sql`${t.costCoins} > 0`),
  check('redemptions_status_ck', sql`${t.status} IN ('pendiente', 'enviado', 'cancelado')`),
]);

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  user: one(user, { fields: [redemptions.userId], references: [user.id] }),
  shopItem: one(shopItems, { fields: [redemptions.shopItemId], references: [shopItems.id] }),
}));
