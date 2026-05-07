import { pgTable, integer, boolean, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { talents } from './talents';

export const talentLiveStatus = pgTable('talent_live_status', {
  talentId:      integer('talent_id').primaryKey().references(() => talents.id, { onDelete: 'cascade' }),
  isLive:        boolean('is_live').notNull().default(false),
  platform:      varchar('platform', { length: 20 }),         // 'twitch' | 'youtube'
  streamTitle:   text('stream_title'),
  gameName:      varchar('game_name', { length: 100 }),
  viewerCount:   integer('viewer_count'),
  thumbnailUrl:  varchar('thumbnail_url', { length: 500 }),
  streamUrl:     varchar('stream_url', { length: 500 }),
  liveVideoId:   varchar('live_video_id', { length: 100 }),   // YouTube embed ID (Phase 2)
  startedAt:     timestamp('started_at', { withTimezone: true }),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }).notNull().defaultNow(),
});

export const talentLiveStatusRelations = relations(talentLiveStatus, ({ one }) => ({
  talent: one(talents, { fields: [talentLiveStatus.talentId], references: [talents.id] }),
}));
