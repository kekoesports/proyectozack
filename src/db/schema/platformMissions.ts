import { pgTable, serial, text, integer, varchar, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

/**
 * Misiones de la plataforma. Recompensas FIJAS y deterministas
 * (sin azar ni apuesta — fuera del ámbito de licencia DGOJ).
 * conditionType: entries_total | distinct_creators | streak_days
 */
export const platformMissions = pgTable('platform_missions', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 150 }).notNull(),
  description: text('description').notNull(),
  conditionType: varchar('condition_type', { length: 30 }).notNull(),
  goal: integer('goal').notNull(),
  rewardCoins: integer('reward_coins').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('platform_missions_active_sort_idx').on(t.isActive, t.sortOrder),
]);

/** Cobros de misión: el UNIQUE evita el doble cobro. */
export const missionClaims = pgTable('mission_claims', {
  id: serial('id').primaryKey(),
  missionId: integer('mission_id').notNull().references(() => platformMissions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('mission_claims_mission_user_uq').on(t.missionId, t.userId),
  index('mission_claims_user_id_idx').on(t.userId),
]);

export const missionClaimsRelations = relations(missionClaims, ({ one }) => ({
  mission: one(platformMissions, { fields: [missionClaims.missionId], references: [platformMissions.id] }),
  user: one(user, { fields: [missionClaims.userId], references: [user.id] }),
}));
