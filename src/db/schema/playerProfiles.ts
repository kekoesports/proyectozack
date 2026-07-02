import { pgTable, serial, text, boolean, timestamp, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

/**
 * Perfil público de jugador (usuarios que entran con Steam a la plataforma de sorteos).
 * 1:1 con `user` de Better Auth. Los admins/staff NO tienen fila aquí.
 */
export const playerProfiles = pgTable('player_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  steamId: varchar('steam_id', { length: 32 }).notNull(),
  steamTradeUrl: text('steam_trade_url'),
  kickUsername: varchar('kick_username', { length: 100 }),
  isPrivate: boolean('is_private').notNull().default(true),
  shippingAddress: text('shipping_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('player_profiles_user_id_uq').on(t.userId),
  uniqueIndex('player_profiles_steam_id_uq').on(t.steamId),
  index('player_profiles_created_at_idx').on(t.createdAt),
]);

export const playerProfilesRelations = relations(playerProfiles, ({ one }) => ({
  user: one(user, { fields: [playerProfiles.userId], references: [user.id] }),
}));
