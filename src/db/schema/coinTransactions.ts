import { pgTable, serial, text, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

/**
 * Libro mayor de monedas. El saldo de un usuario es SIEMPRE
 * SUM(amount) de sus filas — nunca un campo cacheado en cliente.
 * amount > 0 acredita, amount < 0 debita.
 */
export const coinTransactions = pgTable('coin_transactions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  /** racha | mision | sorteo | tienda | admin */
  source: varchar('source', { length: 20 }).notNull(),
  concept: varchar('concept', { length: 200 }).notNull(),
  /** id de la entidad origen (giveawayId, missionId, shopItemId…) para auditoría */
  refId: integer('ref_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('coin_tx_user_id_idx').on(t.userId),
  index('coin_tx_user_created_idx').on(t.userId, t.createdAt),
  index('coin_tx_source_idx').on(t.source),
]);

export const coinTransactionsRelations = relations(coinTransactions, ({ one }) => ({
  user: one(user, { fields: [coinTransactions.userId], references: [user.id] }),
}));
