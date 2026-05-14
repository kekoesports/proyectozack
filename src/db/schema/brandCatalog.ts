import { pgTable, serial, varchar, text, integer, timestamp, index, boolean } from 'drizzle-orm/pg-core';

/**
 * Catálogo de marcas para códigos y sorteos.
 * Permite predefin nombre, logo y URL por defecto para auto-rellenar
 * al crear creator_codes y giveaways.
 * Independiente de crm_brands (que es para clientes/facturación).
 */
export const brandCatalog = pgTable('brand_catalog', {
  id:             serial('id').primaryKey(),
  name:           varchar('name', { length: 150 }).notNull(),
  logoUrl:        varchar('logo_url', { length: 500 }),
  defaultUrl:     text('default_url'),
  category:       varchar('category', { length: 50 }),   // casino|apuestas|skins_cs2|gaming|otros
  isActive:       boolean('is_active').notNull().default(true),
  sortOrder:      integer('sort_order').notNull().default(0),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('brand_catalog_name_idx').on(t.name),
  index('brand_catalog_active_idx').on(t.isActive),
]);
