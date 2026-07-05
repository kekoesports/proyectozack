import { pgTable, serial, text, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { user } from './auth';

/**
 * Registro persistente del consent de partners externos.
 *
 * Fase 1 legal — sustituye a la cookie `sp_partner_consent` como fuente
 * de verdad. Ver `docs/legal-risk-matrix.md` R1.
 *
 * Cada aceptación crea una fila nueva. Al revocar, se marca `revokedAt`
 * en la fila activa. Nunca se hacen UPDATEs sobre `grantedAt` — el
 * historial completo se preserva para auditoría.
 *
 * `consentVersion` permite invalidar consentimientos previos cuando
 * cambia el texto o las condiciones del modal (nueva versión → todos
 * los usuarios ven el modal de nuevo).
 *
 * `ipHash` es SHA-256 de la IP del usuario en el momento de aceptar,
 * NO la IP en claro — se guarda solo el hash para poder detectar
 * patrones de fraude sin retener PII directa.
 */
export const userPartnerConsents = pgTable('user_partner_consents', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  consentVersion: varchar('consent_version', { length: 16 }).notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ipHash: varchar('ip_hash', { length: 64 }),
  userAgent: varchar('user_agent', { length: 500 }),
}, (t) => [
  index('user_partner_consents_user_id_idx').on(t.userId),
  index('user_partner_consents_active_idx').on(t.userId, t.revokedAt),
  // Solo puede haber una fila activa (revokedAt NULL) por usuario+versión.
  // Partial unique index — Postgres soporta WHERE en unique indexes; Drizzle
  // lo expresa via `.where(sql)`.
  uniqueIndex('user_partner_consents_active_uq')
    .on(t.userId, t.consentVersion)
    .where(sql`revoked_at IS NULL`),
]);

export const userPartnerConsentsRelations = relations(userPartnerConsents, ({ one }) => ({
  user: one(user, { fields: [userPartnerConsents.userId], references: [user.id] }),
}));
