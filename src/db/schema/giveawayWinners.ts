import { pgTable, serial, integer, varchar, timestamp, index, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { giveaways } from './giveaways';
import { user } from './auth';

export const giveawayWinners = pgTable('giveaway_winners', {
  id: serial('id').primaryKey(),
  giveawayId: integer('giveaway_id').notNull().references(() => giveaways.id, { onDelete: 'cascade' }),
  winnerName: varchar('winner_name', { length: 100 }).notNull(),
  winnerAvatar: varchar('winner_avatar', { length: 500 }),
  proofUrl: varchar('proof_url', { length: 500 }),   // clip/stream donde se anunció el ganador
  /**
   * FK opcional al `user` real ganador. Legacy winners (manual, sin cuenta)
   * la dejan en null y usan `winnerName`. Los ganadores de sorteos gratis
   * elegidos por `pickRaffleWinner` la rellenan.
   */
  winnerUserId: text('winner_user_id').references(() => user.id, { onDelete: 'set null' }),
  wonAt: timestamp('won_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('giveaway_winners_giveaway_id_idx').on(t.giveawayId),
  index('giveaway_winners_won_at_idx').on(t.wonAt),
  index('giveaway_winners_winner_user_id_idx').on(t.winnerUserId),
]);

export const giveawayWinnersRelations = relations(giveawayWinners, ({ one }) => ({
  giveaway: one(giveaways, { fields: [giveawayWinners.giveawayId], references: [giveaways.id] }),
  winnerUser: one(user, { fields: [giveawayWinners.winnerUserId], references: [user.id] }),
}));
