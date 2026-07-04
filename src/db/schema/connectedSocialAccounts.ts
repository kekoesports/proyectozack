import { pgTable, serial, text, timestamp, varchar, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

/**
 * Cuentas de terceros conectadas al usuario para misiones sociales.
 *
 * Reglas de la Fase A Discord:
 *  - `access_token_encrypted`: cifrado con AES-256-GCM
 *    (`src/lib/crypto/token-encryption.ts`). NUNCA texto plano.
 *  - `refresh_token_encrypted`: **null en Discord Fase A**. El access
 *    token vive 7 días; cuando expire, se pide reconexión al usuario
 *    en lugar de mantener refresh tokens. Esta columna existe para
 *    fases futuras (Twitch, YouTube) donde el refresh sí se usa.
 *  - `scope`: lista separada por espacios, tal como llega de la OAuth.
 *  - `expires_at`: timestamp de expiración del access_token.
 *  - `disconnected_at`: soft delete — permite auditoría sin borrar
 *    filas históricas.
 *  - `metadata`: JSONB para datos NO PII adicionales. En Fase A queda
 *    NULL — reservado a información de canal (ej. broadcaster_id de
 *    Twitch cuando conectemos).
 *
 * Uniqueness:
 *  - (user_id, provider) — una cuenta por usuario y plataforma.
 *  - (provider, provider_user_id) — evita que dos usuarios SocialPro
 *    diferentes reclamen con la misma cuenta social.
 */
export const connectedSocialAccounts = pgTable('connected_social_accounts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  /** 'discord' | 'twitch' | 'kick' | 'youtube' */
  provider: varchar('provider', { length: 20 }).notNull(),
  /** Discord user ID, Twitch user ID, YouTube channel ID, etc. */
  providerUserId: varchar('provider_user_id', { length: 64 }).notNull(),
  /** Username en la plataforma (informativo, editable por el usuario). */
  providerUsername: varchar('provider_username', { length: 100 }),
  /** Nombre visible en la plataforma (Global Name para Discord). */
  providerDisplayName: varchar('provider_display_name', { length: 100 }),
  /** Access token cifrado AES-256-GCM. Nunca en claro. */
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  /** Refresh token cifrado. NULL en Discord Fase A. */
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  /** Scopes concedidos por el usuario (separados por espacios). */
  scope: text('scope').notNull(),
  /** Fecha en la que expira el access token. */
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  connectedAt: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
  disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (t) => [
  uniqueIndex('conn_social_user_provider_uq').on(t.userId, t.provider),
  uniqueIndex('conn_social_provider_user_uq').on(t.provider, t.providerUserId),
  index('conn_social_user_idx').on(t.userId),
]);

export const connectedSocialAccountsRelations = relations(connectedSocialAccounts, ({ one }) => ({
  user: one(user, { fields: [connectedSocialAccounts.userId], references: [user.id] }),
}));
