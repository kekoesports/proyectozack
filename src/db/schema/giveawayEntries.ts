import { pgTable, serial, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { giveaways } from './giveaways';

/**
 * Participaciones (tickets) en sorteos. Referencia la tabla `giveaways`
 * existente. El UNIQUE (giveaway_id, user_id) garantiza idempotencia:
 * un usuario solo puede inscribirse una vez por sorteo.
 * El contador público de participantes = COUNT(*) por giveaway_id.
 */
export const giveawayEntries = pgTable('giveaway_entries', {
  id: serial('id').primaryKey(),
  giveawayId: integer('giveaway_id').notNull().references(() => giveaways.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('giveaway_entries_giveaway_user_uq').on(t.giveawayId, t.userId),
  index('giveaway_entries_user_id_idx').on(t.userId),
  index('giveaway_entries_giveaway_id_idx').on(t.giveawayId),
  index('giveaway_entries_user_created_idx').on(t.userId, t.createdAt),
]);

export const giveawayEntriesRelations = relations(giveawayEntries, ({ one }) => ({
  giveaway: one(giveaways, { fields: [giveawayEntries.giveawayId], references: [giveaways.id] }),
  user: one(user, { fields: [giveawayEntries.userId], references: [user.id] }),
}));
