import { pgTable, serial, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

export const newsAlerts = pgTable('news_alerts', {
  id: serial('id').primaryKey(),
  /** MD5(source_url) — clave de deduplicación. ON CONFLICT DO NOTHING. */
  externalId:      varchar('external_id', { length: 64 }).notNull().unique(),
  title:           text('title').notNull(),
  sourceName:      varchar('source_name', { length: 200 }),
  sourceUrl:       text('source_url').notNull(),
  /** Extracto ~150-200 chars de NewsData description */
  snippet:         text('snippet'),
  imageUrl:        varchar('image_url', { length: 500 }),
  /** Keywords que dispararon esta alerta */
  keywordsMatched: text('keywords_matched').array().notNull().default([]),
  /** regulatory | competitor | brand | sector | own */
  category:        varchar('category', { length: 50 }).notNull(),
  /** high | medium | low — derivado de category */
  priority:        varchar('priority', { length: 10 }).notNull(),
  language:        varchar('language', { length: 5 }),
  publishedAt:     timestamp('published_at', { withTimezone: true }),
  syncedAt:        timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
  /** null = no leída */
  readAt:          timestamp('read_at', { withTimezone: true }),
  /** null = activa; NOT NULL = archivada */
  dismissedAt:     timestamp('dismissed_at', { withTimezone: true }),
}, (t) => [
  index('news_alerts_category_idx').on(t.category),
  index('news_alerts_published_at_idx').on(t.publishedAt),
  index('news_alerts_read_at_idx').on(t.readAt),
]);
