import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { connectedSocialAccounts } from '@/db/schema';

/**
 * Devuelve la cuenta conectada activa (sin `disconnectedAt`) del usuario
 * para un provider concreto. Null si nunca conectó o si la desconectó.
 *
 * NO devuelve el token descifrado — se descifra a nivel del caller si
 * hace falta usarlo.
 */
export async function getConnectedAccount(userId: string, provider: string) {
  const [row] = await db
    .select()
    .from(connectedSocialAccounts)
    .where(and(
      eq(connectedSocialAccounts.userId, userId),
      eq(connectedSocialAccounts.provider, provider),
      isNull(connectedSocialAccounts.disconnectedAt),
    ))
    .limit(1);
  return row ?? null;
}

/**
 * Guarda o actualiza la cuenta conectada. Reutiliza el UNIQUE
 * (user_id, provider) para hacer upsert. Si existe y estaba
 * desconectada, la reactiva.
 */
export async function upsertConnectedAccount(input: {
  userId: string;
  provider: string;
  providerUserId: string;
  providerUsername: string | null;
  providerDisplayName: string | null;
  accessTokenEncrypted: string;
  scope: string;
  expiresAt: Date | null;
}) {
  const existing = await db
    .select({ id: connectedSocialAccounts.id })
    .from(connectedSocialAccounts)
    .where(and(
      eq(connectedSocialAccounts.userId, input.userId),
      eq(connectedSocialAccounts.provider, input.provider),
    ))
    .limit(1);

  if (existing[0]) {
    await db
      .update(connectedSocialAccounts)
      .set({
        providerUserId: input.providerUserId,
        providerUsername: input.providerUsername,
        providerDisplayName: input.providerDisplayName,
        accessTokenEncrypted: input.accessTokenEncrypted,
        scope: input.scope,
        expiresAt: input.expiresAt,
        connectedAt: new Date(),
        disconnectedAt: null,
      })
      .where(eq(connectedSocialAccounts.id, existing[0].id));
    return existing[0].id;
  }

  const [inserted] = await db
    .insert(connectedSocialAccounts)
    .values({
      userId: input.userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      providerUsername: input.providerUsername,
      providerDisplayName: input.providerDisplayName,
      accessTokenEncrypted: input.accessTokenEncrypted,
      scope: input.scope,
      expiresAt: input.expiresAt,
    })
    .returning({ id: connectedSocialAccounts.id });
  return inserted?.id ?? null;
}

/** Marca la cuenta como desconectada (soft delete). Mantiene fila y token cifrado para auditoría. */
export async function markAccountDisconnected(userId: string, provider: string) {
  await db
    .update(connectedSocialAccounts)
    .set({ disconnectedAt: new Date() })
    .where(and(
      eq(connectedSocialAccounts.userId, userId),
      eq(connectedSocialAccounts.provider, provider),
      isNull(connectedSocialAccounts.disconnectedAt),
    ));
}
