import { pgTable, serial, text, integer, varchar, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

/**
 * Misiones de la plataforma. Recompensas FIJAS y deterministas
 * (sin azar ni apuesta — fuera del ámbito de licencia DGOJ).
 *
 * `conditionType` sigue siendo el enum interno para misiones de actividad
 * (entries_total | distinct_creators | streak_days). No confundir con
 * `verificationMode` — ese último se usa para misiones que verifican
 * acciones en plataformas externas (Discord, Twitch, etc.).
 *
 * Fase A Discord: columnas nuevas `provider`, `targetId`, `targetUrl`,
 * `verificationMode`. Nullables — no rompen misiones existentes.
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
  /** 'discord' | 'twitch' | 'kick' | 'youtube' — null para misiones internas. */
  provider: varchar('provider', { length: 20 }),
  /** Guild ID (Discord), broadcaster_id (Twitch), channel_id (YouTube), etc. */
  targetId: varchar('target_id', { length: 100 }),
  /** URL pública asociada — invite Discord, canal Twitch/Kick, vídeo YouTube. */
  targetUrl: varchar('target_url', { length: 500 }),
  /** 'discord_guild_member' | 'twitch_follow' | ... (más modos en fases futuras) */
  verificationMode: varchar('verification_mode', { length: 30 }),
}, (t) => [
  index('platform_missions_active_sort_idx').on(t.isActive, t.sortOrder),
  index('platform_missions_provider_idx').on(t.provider),
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

/**
 * Registro de intentos de verificación para misiones sociales.
 * Se usa para rate limit por (mission_id, user_id) — típicamente 30s
 * entre intentos. No sustituye al UNIQUE de `mission_claims`, que sigue
 * bloqueando el doble claim tras un intento exitoso.
 *
 * `outcome`:
 *   'success'          → confirmó verificación (crea mission_claim después).
 *   'not_verified'     → API confirmó que no cumple (no miembro, no sigue, etc.).
 *   'api_error'        → fallo de la API externa (5xx, timeout, cuota).
 *   'token_expired'    → token OAuth expiró — usuario debe reconectar.
 *   'not_connected'    → usuario aún no ha conectado la cuenta social.
 *   'rate_limited'     → intento bloqueado por el propio cooldown.
 *   'invalid'          → estado inconsistente (misión sin provider, etc.).
 */
export const missionVerificationAttempts = pgTable('mission_verification_attempts', {
  id: serial('id').primaryKey(),
  missionId: integer('mission_id').notNull().references(() => platformMissions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  outcome: varchar('outcome', { length: 20 }).notNull(),
}, (t) => [
  index('mission_verif_user_mission_time_idx').on(t.userId, t.missionId, t.attemptedAt),
]);

export const missionClaimsRelations = relations(missionClaims, ({ one }) => ({
  mission: one(platformMissions, { fields: [missionClaims.missionId], references: [platformMissions.id] }),
  user: one(user, { fields: [missionClaims.userId], references: [user.id] }),
}));

export const missionVerificationAttemptsRelations = relations(missionVerificationAttempts, ({ one }) => ({
  mission: one(platformMissions, { fields: [missionVerificationAttempts.missionId], references: [platformMissions.id] }),
  user: one(user, { fields: [missionVerificationAttempts.userId], references: [user.id] }),
}));
