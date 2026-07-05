import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userPartnerConsents } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type UserPartnerConsent = InferSelectModel<typeof userPartnerConsents>;

/**
 * Versión canónica del texto de consent que se muestra en el modal.
 * Cuando el copy cambie, incrementar esta constante — los usuarios
 * verán el modal de nuevo automáticamente.
 */
export const CURRENT_CONSENT_VERSION = 'v1';

/**
 * Devuelve el consent activo del usuario (revoked_at IS NULL) para la
 * versión actual, o `null` si no existe.
 */
export async function getActiveConsent(userId: string): Promise<UserPartnerConsent | null> {
  const rows = await db
    .select()
    .from(userPartnerConsents)
    .where(and(
      eq(userPartnerConsents.userId, userId),
      eq(userPartnerConsents.consentVersion, CURRENT_CONSENT_VERSION),
      isNull(userPartnerConsents.revokedAt),
    ))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * True si el usuario tiene un consent activo para la versión actual.
 * Helper conveniente para gating.
 */
export async function hasActivePartnerConsent(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const active = await getActiveConsent(userId);
  return active !== null;
}

/**
 * Inserta un consent nuevo para la versión actual. Si ya existía uno
 * activo, no crea uno nuevo (idempotente vía partial UNIQUE index).
 * `ipHash` y `userAgent` opcionales — el caller (server action) los
 * calcula desde headers.
 */
export async function insertConsent(input: {
  userId:    string;
  ipHash?:   string | null;
  userAgent?: string | null;
}): Promise<UserPartnerConsent> {
  // Insert idempotente: si ya hay una fila activa por (userId, version),
  // el partial UNIQUE index la deja pasar solo si no existe.
  const [row] = await db
    .insert(userPartnerConsents)
    .values({
      userId:         input.userId,
      consentVersion: CURRENT_CONSENT_VERSION,
      ipHash:         input.ipHash ?? null,
      userAgent:      input.userAgent ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (row) return row;

  // Ya existía uno activo — devolvemos el existente.
  const existing = await getActiveConsent(input.userId);
  if (!existing) throw new Error('insertConsent: consent activo esperado tras conflict');
  return existing;
}

/**
 * Marca el consent activo del usuario como revocado (revoked_at = now()).
 * No-op si no hay consent activo.
 */
export async function revokeConsent(userId: string): Promise<void> {
  await db
    .update(userPartnerConsents)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(userPartnerConsents.userId, userId),
      eq(userPartnerConsents.consentVersion, CURRENT_CONSENT_VERSION),
      isNull(userPartnerConsents.revokedAt),
    ));
}

/**
 * Historial completo (activos + revocados) del usuario, más reciente
 * primero. Para la pantalla /sorteos/perfil/permisos.
 */
export async function getConsentHistory(userId: string, limit = 20): Promise<UserPartnerConsent[]> {
  return db
    .select()
    .from(userPartnerConsents)
    .where(eq(userPartnerConsents.userId, userId))
    .orderBy(desc(userPartnerConsents.grantedAt))
    .limit(limit);
}
