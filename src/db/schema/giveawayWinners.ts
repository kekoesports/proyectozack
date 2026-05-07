import { pgTable, serial, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { giveaways } from './giveaways';

export const giveawayWinners = pgTable('giveaway_winners', {
  id: serial('id').primaryKey(),
  giveawayId: integer('giveaway_id').notNull().references(() => giveaways.id, { onDelete: 'cascade' }),
  winnerName: varchar('winner_name', { length: 100 }).notNull(),
  winnerAvatar: varchar('winner_avatar', { length: 500 }),
  proofUrl: varchar('proof_url', { length: 500 }),   // clip/stream donde se anunció el ganador
  wonAt: timestamp('won_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('giveaway_winners_giveaway_id_idx').on(t.giveawayId),
  index('giveaway_winners_won_at_idx').on(t.wonAt),
]);

export const giveawayWinnersRelations = relations(giveawayWinners, ({ one }) => ({
  giveaway: one(giveaways, { fields: [giveawayWinners.giveawayId], references: [giveaways.id] }),
}));
