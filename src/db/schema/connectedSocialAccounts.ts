import { pgTable, serial, text, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

/**
 * Cuentas sociales enlazadas a un usuario (que se autentica con Steam).
 * NO son providers de autenticación — sólo se usan para verificar acciones
 * en misiones sociales (RT, follow, join Discord, like YT…) en PR-1b-2.
 *
 * Tokens guardados cifrados con AES-256-GCM (ver src/lib/social/crypto.ts).
 * NUNCA se loggean ni se serializan a UI.
 *
 * Providers: 'discord' | 'google' | 'x' | 'instagram'.
 *   - discord, google: activos en PR-1b-1.
 *   - x, instagram:    reservados para el futuro (UI dice "próximamente").
 *
 * Constraints:
 *   - UNIQUE(provider, provider_user_id): 1 cuenta social ↔ 1 usuario SocialPro.
 *   - UNIQUE(user_id, provider):          1 usuario, 1 cuenta por provider.
 *   - ON DELETE CASCADE en user_id:       si desaparece el user, tokens también.
 */
export const connectedSocialAccounts = pgTable('connected_social_accounts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(),
  providerUserId: text('provider_user_id').notNull(),
  username: text('username'),
  avatarUrl: text('avatar_url'),
  /** base64 de nonce(12B) | ciphertext | authTag(16B). AES-256-GCM. */
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc'),
  /** scopes concedidos por el user en el consent screen del provider */
  scopes: text('scopes').array(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('connected_social_accounts_provider_provider_user_id_uq').on(t.provider, t.providerUserId),
  uniqueIndex('connected_social_accounts_user_id_provider_uq').on(t.userId, t.provider),
  index('connected_social_accounts_user_id_idx').on(t.userId),
  index('connected_social_accounts_provider_idx').on(t.provider),
]);

export const connectedSocialAccountsRelations = relations(connectedSocialAccounts, ({ one }) => ({
  user: one(user, { fields: [connectedSocialAccounts.userId], references: [user.id] }),
}));
