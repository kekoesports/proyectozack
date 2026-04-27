import { pgTable, serial, varchar, text, integer, pgEnum, index, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// platform: real values from source data are 'twitch' | 'youtube' only
export const platformEnum = pgEnum('platform', ['twitch', 'youtube']);
// status: active (working) | available (open for hire) | inactive (retired/paused)
export const statusEnum = pgEnum('status', ['active', 'available', 'inactive']);
// visibility: controls whether talent appears on public site
export const visibilityEnum = pgEnum('visibility', ['public', 'internal']);

export const talents = pgTable('talents', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 150 }).notNull(),
  game: varchar('game', { length: 100 }).notNull(),
  platform: platformEnum('platform').notNull(),
  status: statusEnum('status').notNull().default('active'),
  bio: text('bio').notNull(),
  gradientC1: varchar('gradient_c1', { length: 7 }).notNull(),
  gradientC2: varchar('gradient_c2', { length: 7 }).notNull(),
  initials: varchar('initials', { length: 4 }).notNull(),
  photoUrl: varchar('photo_url', { length: 500 }),
  sortOrder: integer('sort_order').notNull().default(0),
  visibility: visibilityEnum('visibility').notNull().default('public'),
  topGeos: jsonb('top_geos').$type<Array<{ country: string; pct: number }>>(),
  audienceLanguage: text('audience_language'),
  creatorCountry: varchar('creator_country', { length: 2 }),
  audienceStatus: varchar('audience_status', { length: 20 }), // 'activo'|'inactivo'|'pendiente'|'potencial'
  lastStatsUpdateAt: timestamp('last_stats_update_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('talents_slug_idx').on(t.slug),
  index('talents_platform_idx').on(t.platform),
  index('talents_status_idx').on(t.status),
]);

export const talentTags = pgTable('talent_tags', {
  id: serial('id').primaryKey(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 100 }).notNull(),
}, (t) => [
  index('talent_tags_talent_id_idx').on(t.talentId),
]);

export const talentStats = pgTable('talent_stats', {
  id: serial('id').primaryKey(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  icon: varchar('icon', { length: 10 }).notNull(),
  value: varchar('value', { length: 50 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('talent_stats_talent_id_idx').on(t.talentId),
]);

export const talentSocials = pgTable('talent_socials', {
  id: serial('id').primaryKey(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 50 }).notNull(),
  handle: varchar('handle', { length: 100 }).notNull(),
  followersDisplay: varchar('followers_display', { length: 20 }).notNull(),
  profileUrl: text('profile_url'),
  hexColor: varchar('hex_color', { length: 7 }).notNull(),
  platformId: varchar('platform_id', { length: 200 }),
  sortOrder: integer('sort_order').notNull().default(0),
  avgViewers: integer('avg_viewers'),
  topGeos: jsonb('top_geos').$type<Array<{ country: string; pct: number }>>(),
}, (t) => [
  index('talent_socials_talent_id_idx').on(t.talentId),
]);

export const talentsRelations = relations(talents, ({ many }) => ({
  tags: many(talentTags),
  stats: many(talentStats),
  socials: many(talentSocials),
}));

export const talentTagsRelations = relations(talentTags, ({ one }) => ({
  talent: one(talents, { fields: [talentTags.talentId], references: [talents.id] }),
}));

export const talentStatsRelations = relations(talentStats, ({ one }) => ({
  talent: one(talents, { fields: [talentStats.talentId], references: [talents.id] }),
}));

export const talentSocialsRelations = relations(talentSocials, ({ one }) => ({
  talent: one(talents, { fields: [talentSocials.talentId], references: [talents.id] }),
}));
