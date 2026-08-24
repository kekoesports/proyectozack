import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Activos que antes se descubrían listando Vercel Blob por prefijo.
 *
 * Es deliberadamente polimórfico: talento, miembro de equipo y marca viven en
 * tablas distintas. `entityId` no puede tener una FK única sin duplicar tres
 * tablas casi idénticas.
 */
export const entityAssetKindEnum = pgEnum('entity_asset_kind', [
  'talent_photo',
  'team_photo',
  'brand_logo',
]);

export const entityAssets = pgTable(
  'entity_assets',
  {
    id: serial('id').primaryKey(),
    kind: entityAssetKindEnum('kind').notNull(),
    entityId: integer('entity_id').notNull(),
    storageKey: text('storage_key').notNull(),
    contentType: varchar('content_type', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('entity_assets_storage_key_uq').on(t.storageKey),
    index('entity_assets_owner_latest_idx').on(t.kind, t.entityId, t.createdAt),
  ],
);
