import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

export const targetStatusEnum = pgEnum('target_status', [
  'pendiente',
  'contactado',
  'finalizado',
  'descartado',
]);

export const targetPlatformEnum = pgEnum('target_platform', [
  'instagram',
  'youtube',
  'twitch',
  'kick',
]);

export const targets = pgTable(
  'targets',
  {
    id: serial('id').primaryKey(),

    // Identity
    username: varchar('username', { length: 200 }).notNull(),
    fullName: varchar('full_name', { length: 300 }),
    platform: targetPlatformEnum('platform').notNull(),
    profileUrl: text('profile_url').notNull(),
    profilePicUrl: text('profile_pic_url'),

    // Metrics
    followers: integer('followers').notNull().default(0),
    following: integer('following'),
    posts: integer('posts'),
    bio: text('bio'),
    externalUrl: text('external_url'),

    // Qualification and outreach metadata (mainly YouTube discovery)
    countryCode: varchar('country_code', { length: 2 }),
    defaultLanguage: varchar('default_language', { length: 10 }),
    lastVideoAt: timestamp('last_video_at', { withTimezone: true }),
    recentVideoCount: integer('recent_video_count'),
    minRecentVideoViews: integer('min_recent_video_views'),
    avgRecentVideoViews: integer('avg_recent_video_views'),
    recentVideosWindowDays: integer('recent_videos_window_days'),
    qualificationUpdatedAt: timestamp('qualification_updated_at', { withTimezone: true }),
    contactEmail: varchar('contact_email', { length: 320 }),
    contactUrl: text('contact_url'),

    // Instagram-specific (nullable for YouTube targets)
    isPrivate: boolean('is_private'),
    isVerified: boolean('is_verified'),
    isBusiness: boolean('is_business'),
    isCreator: boolean('is_creator'),
    businessCategory: varchar('business_category', { length: 200 }),

    // Outreach workflow
    brandUserId: text('brand_user_id').references(() => user.id, { onDelete: 'set null' }),
    status: targetStatusEnum('status').notNull().default('pendiente'),
    notes: text('notes'),

    // Discovery metadata
    discoveredVia: varchar('discovered_via', { length: 200 }),
    importBatchId: varchar('import_batch_id', { length: 50 }),

    // Timestamps
    enrichedAt: timestamp('enriched_at', { withTimezone: true }),
    contactedAt: timestamp('contacted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('targets_platform_idx').on(t.platform),
    index('targets_brand_user_idx').on(t.brandUserId),
    index('targets_status_idx').on(t.status),
    index('targets_followers_idx').on(t.followers),
    index('targets_country_code_idx').on(t.countryCode),
    index('targets_last_video_at_idx').on(t.lastVideoAt),
    index('targets_recent_video_quality_idx').on(t.recentVideoCount, t.minRecentVideoViews),
    index('targets_created_at_idx').on(t.createdAt),
    index('targets_import_batch_idx').on(t.importBatchId),
    unique('targets_platform_username_key').on(t.platform, t.username),
  ],
);
