import { pgTable, serial, integer, text, date, timestamp, index, unique, jsonb, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { talents } from './talents';
import { user } from './auth';

export const talentMetricSnapshots = pgTable('talent_metric_snapshots', {
  id: serial('id').primaryKey(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(), // 'youtube' | 'twitch'
  metricType: text('metric_type').notNull(), // 'subscribers' | 'followers'
  value: integer('value').notNull(),
  snapshotDate: date('snapshot_date').notNull(),
  topGeos: jsonb('top_geos').$type<Array<{ country: string; pct: number }>>(),
  notes: text('notes'),
  updatedByUserId: text('updated_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),

  // ── Gaming metrics extended (competitive intelligence gap vs CreatorIQ / Wehype) ──
  // Twitch-specific
  avgCcv: integer('avg_ccv'),               // Average Concurrent Viewers (30-day rolling avg)
  peakCcv: integer('peak_ccv'),             // Peak Concurrent Viewers in snapshot period
  hoursBroadcast: numeric('hours_broadcast', { precision: 8, scale: 2 }), // Hours streamed in period
  topGameCategories: jsonb('top_game_categories')
    .$type<Array<{ name: string; hours: number; pct: number }>>(), // Top games played
  chatMsgsPerHour: numeric('chat_msgs_per_hour', { precision: 8, scale: 2 }), // Chat engagement rate
  // YouTube-specific
  avgViewsPerVideo30d: integer('avg_views_per_video_30d'), // Average views per video (last 30 days)
  uploadFrequencyPerMonth: numeric('upload_frequency_per_month', { precision: 5, scale: 2 }), // Videos/month
  // Both platforms
  followerGrowth30d: integer('follower_growth_30d'),   // Absolute follower change in 30 days
  followerGrowthPct30d: numeric('follower_growth_pct_30d', { precision: 7, scale: 4 }), // % growth
  audienceGeoTop3: jsonb('audience_geo_top3')
    .$type<Array<{ country: string; pct: number }>>(), // Top 3 audience countries (from OAuth or manual)
  fraudScorePct: numeric('fraud_score_pct', { precision: 5, scale: 2 }), // Estimated fake followers %
  dataSource: text('data_source'), // 'twitch_api' | 'youtube_api' | 'manual' | 'sully_gnome' | 'streamelements'
}, (t) => [
  index('tms_talent_date_idx').on(t.talentId, t.snapshotDate),
  index('tms_platform_idx').on(t.platform),
  unique('tms_unique_snapshot').on(t.talentId, t.platform, t.metricType, t.snapshotDate),
]);

export const talentMetricSnapshotsRelations = relations(talentMetricSnapshots, ({ one }) => ({
  talent: one(talents, { fields: [talentMetricSnapshots.talentId], references: [talents.id] }),
}));
