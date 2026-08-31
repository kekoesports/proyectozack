import { relations } from 'drizzle-orm';
import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { talentSocials, talents } from './talents';

/**
 * Foto diaria comparable de cada canal propio de la agencia.
 *
 * Se mantiene separada de `talent_metric_snapshots`: aquella tabla conserva
 * compatibilidad con informes históricos; esta reúne en una fila los datos
 * necesarios para decidir si un canal acelera o se estanca.
 */
export const talentChannelSnapshots = pgTable(
  'talent_channel_snapshots',
  {
    id: serial('id').primaryKey(),
    talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
    socialId: integer('social_id').notNull().references(() => talentSocials.id, { onDelete: 'cascade' }),
    platform: varchar('platform', { length: 30 }).notNull(),
    snapshotDate: date('snapshot_date').notNull(),
    followers: bigint('followers', { mode: 'number' }).notNull().default(0),
    totalViews: bigint('total_views', { mode: 'number' }),
    contentCount: integer('content_count'),
    recentViews30d: bigint('recent_views_30d', { mode: 'number' }),
    avgViews30d: bigint('avg_views_30d', { mode: 'number' }),
    uploads30d: integer('uploads_30d'),
    engagementRate30d: numeric('engagement_rate_30d', { precision: 8, scale: 4 }),
    avgCcv30d: integer('avg_ccv_30d'),
    peakCcv30d: integer('peak_ccv_30d'),
    hoursLive30d: numeric('hours_live_30d', { precision: 9, scale: 2 }),
    dataSource: varchar('data_source', { length: 40 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('talent_channel_snapshots_social_date_uq').on(t.socialId, t.snapshotDate),
    index('talent_channel_snapshots_talent_date_idx').on(t.talentId, t.snapshotDate),
    index('talent_channel_snapshots_platform_date_idx').on(t.platform, t.snapshotDate),
  ],
);

/** Rendimiento público del contenido publicado por los canales representados. */
export const talentContentPerformance = pgTable(
  'talent_content_performance',
  {
    id: serial('id').primaryKey(),
    talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
    socialId: integer('social_id').notNull().references(() => talentSocials.id, { onDelete: 'cascade' }),
    platform: varchar('platform', { length: 30 }).notNull(),
    externalContentId: varchar('external_content_id', { length: 160 }).notNull(),
    title: text('title').notNull(),
    contentUrl: text('content_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    contentType: varchar('content_type', { length: 24 }).notNull().default('video'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    viewCount: bigint('view_count', { mode: 'number' }).notNull().default(0),
    likeCount: bigint('like_count', { mode: 'number' }),
    commentCount: integer('comment_count'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('talent_content_performance_platform_external_uq').on(t.platform, t.externalContentId),
    index('talent_content_performance_talent_published_idx').on(t.talentId, t.publishedAt),
    index('talent_content_performance_views_idx').on(t.viewCount),
  ],
);

export const talentChannelSnapshotsRelations = relations(talentChannelSnapshots, ({ one }) => ({
  talent: one(talents, { fields: [talentChannelSnapshots.talentId], references: [talents.id] }),
  social: one(talentSocials, { fields: [talentChannelSnapshots.socialId], references: [talentSocials.id] }),
}));

export const talentContentPerformanceRelations = relations(talentContentPerformance, ({ one }) => ({
  talent: one(talents, { fields: [talentContentPerformance.talentId], references: [talents.id] }),
  social: one(talentSocials, { fields: [talentContentPerformance.socialId], references: [talentSocials.id] }),
}));
