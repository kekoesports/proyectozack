import { pgTable, serial, text, varchar, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

/**
 * Log central de eventos de auditoría para SocialPro Giveaways.
 *
 * Sustituye/complementa a `giveaway_events` (que registra solo view/click
 * anónimos). Aquí se registran acciones identificadas del usuario que
 * requieren forensics, antifraude o cumplimiento legal.
 *
 * Diseño:
 *   - `userId` nullable → algunos eventos pueden ser pre-sesión (p.ej.
 *     visitas a documentos legales) o del sistema (backfill).
 *   - `action` con set cerrado — ver ALLOWED_ACTIONS abajo.
 *   - `refType` + `refId` para relacionar con la entidad concreta
 *     (giveaway, shop_item, mission, consent…).
 *   - `outcome` para diferenciar success / blocked / error / rate_limited.
 *   - `ipHash` (SHA-256) y `userAgent` para forensics sin retener PII directa.
 *   - `country` (x-vercel-ip-country) para segmentación por geografía.
 *   - `metadata` jsonb — payload extra que puede variar por action.
 *
 * Ledger append-only: sin UPDATE ni DELETE. Retención definida por
 * política operativa (fuera de este documento).
 */
export const giveawayAuditEvents = pgTable('sp_audit_events', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 40 }).notNull(),
  refType: varchar('ref_type', { length: 40 }),
  refId: integer('ref_id'),
  outcome: varchar('outcome', { length: 24 }).notNull(),
  ipHash: varchar('ip_hash', { length: 64 }),
  userAgent: varchar('user_agent', { length: 500 }),
  country: varchar('country', { length: 2 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('sp_audit_events_user_idx').on(t.userId),
  index('sp_audit_events_action_idx').on(t.action),
  index('sp_audit_events_created_at_idx').on(t.createdAt),
  index('sp_audit_events_ref_idx').on(t.refType, t.refId),
]);

export const giveawayAuditEventsRelations = relations(giveawayAuditEvents, ({ one }) => ({
  user: one(user, { fields: [giveawayAuditEvents.userId], references: [user.id] }),
}));

/**
 * Set cerrado de actions permitidas. Cualquier action fuera de esta lista
 * debe rechazarse en el helper `logGiveawayEvent` (guardrail).
 */
export const AUDIT_ACTIONS = [
  // Consent
  'partner_consent_granted',
  'partner_consent_revoked',
  // Sorteos internos
  'giveaway_participate',
  // Sorteos gratis (entry_award_coins = 0)
  'free_raffle_participate',
  // Elección de ganador (admin)
  'raffle_winner_picked',
  // Canjeos
  'shop_redeem',
  // Misiones
  'mission_verify',
  'mission_claim',
  // Racha
  'streak_claim',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_OUTCOMES = [
  'success',
  'blocked',
  'error',
  'rate_limited',
  'already_done',
  'unauthorized',
] as const;

export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];
