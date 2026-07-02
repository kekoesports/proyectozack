import { pgTable, serial, text, integer, date, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

/**
 * Racha diaria por usuario. currentDay ∈ [1..7], se resetea si
 * lastClaimDate < ayer. Las cantidades por día viven en
 * src/lib/giveaway-platform/constants.ts (fijas, sin azar).
 */
export const dailyStreaks = pgTable('daily_streaks', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  currentDay: integer('current_day').notNull().default(1),
  lastClaimDate: date('last_claim_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('daily_streaks_user_id_uq').on(t.userId),
]);

export const dailyStreaksRelations = relations(dailyStreaks, ({ one }) => ({
  user: one(user, { fields: [dailyStreaks.userId], references: [user.id] }),
}));
