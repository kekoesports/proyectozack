import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { connectedSocialAccounts } from '@/db/schema';
import { encryptToken, decryptToken } from './crypto';
import type { SocialProviderKey } from './providers';
import type { NormalizedProfile, TokenResponse } from './oauth';

/**
 * Capa de acceso a `connected_social_accounts`.
 *
 * Regla dura: ni `access_token_enc` ni `refresh_token_enc` salen NUNCA
 * de este módulo hacia UI. `upsertSocialAccount` los cifra al escribir.
 * `getDecryptedTokens` los descifra bajo demanda (solo desde server
 * actions/verifiers, nunca desde queries que serializan a cliente).
 */

/**
 * Row segura para pasar a UI: sin token fields.
 */
export interface SafeSocialAccountRow {
  id: number;
  provider: string;
  providerUserId: string;
  username: string | null;
  avatarUrl: string | null;
  scopes: string[] | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Escribe/actualiza la cuenta social del usuario. Cifra los tokens antes
 * de guardar. Retorna la row `SafeSocialAccountRow` (sin tokens).
 *
 * Idempotente por UNIQUE (user_id, provider): reconnect actualiza tokens
 * y perfil. Si la misma cuenta social (provider, provider_user_id) ya
 * pertenece a OTRO user, el UNIQUE explota → error 'already_linked'.
 */
export async function upsertSocialAccount(input: {
  userId: string;
  provider: SocialProviderKey;
  profile: NormalizedProfile;
  token: TokenResponse;
}): Promise<SafeSocialAccountRow> {
  const { userId, provider, profile, token } = input;

  const accessTokenEnc = encryptToken(token.accessToken);
  const refreshTokenEnc = token.refreshToken ? encryptToken(token.refreshToken) : null;
  const expiresAt = token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000) : null;
  const scopes = token.scope ? token.scope.split(/\s+/).filter(Boolean) : null;

  try {
    const [row] = await db
      .insert(connectedSocialAccounts)
      .values({
        userId,
        provider,
        providerUserId: profile.providerUserId,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        accessTokenEnc,
        refreshTokenEnc,
        scopes,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [connectedSocialAccounts.userId, connectedSocialAccounts.provider],
        set: {
          providerUserId: profile.providerUserId,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
          accessTokenEnc,
          refreshTokenEnc,
          scopes,
          expiresAt,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: connectedSocialAccounts.id,
        provider: connectedSocialAccounts.provider,
        providerUserId: connectedSocialAccounts.providerUserId,
        username: connectedSocialAccounts.username,
        avatarUrl: connectedSocialAccounts.avatarUrl,
        scopes: connectedSocialAccounts.scopes,
        expiresAt: connectedSocialAccounts.expiresAt,
        createdAt: connectedSocialAccounts.createdAt,
        updatedAt: connectedSocialAccounts.updatedAt,
      });
    if (!row) throw new Error('Insert vacío');
    return row;
  } catch (e) {
    // Postgres 23505 = UNIQUE violation. Aquí lo relevante es
    // UNIQUE(provider, provider_user_id) ya que UNIQUE(user_id, provider)
    // se resuelve por el ON CONFLICT DO UPDATE.
    if (isUniqueViolation(e)) {
      const err = new Error('already_linked');
      err.name = 'SocialAccountAlreadyLinkedError';
      throw err;
    }
    throw e;
  }
}

/**
 * Elimina la cuenta social del usuario. Devuelve el access_token
 * descifrado (si existía) para que el caller pueda intentar el revoke
 * best-effort en el provider. Si no existía cuenta, retorna null.
 */
export async function deleteSocialAccount(input: {
  userId: string;
  provider: SocialProviderKey;
}): Promise<{ accessToken: string | null } | null> {
  const { userId, provider } = input;
  const [existing] = await db
    .select({
      accessTokenEnc: connectedSocialAccounts.accessTokenEnc,
    })
    .from(connectedSocialAccounts)
    .where(and(
      eq(connectedSocialAccounts.userId, userId),
      eq(connectedSocialAccounts.provider, provider),
    ));
  if (!existing) return null;

  let accessToken: string | null = null;
  try {
    accessToken = decryptToken(existing.accessTokenEnc);
  } catch {
    // si la key rotó o el ciphertext se corrompió, no bloqueamos el delete
  }

  await db
    .delete(connectedSocialAccounts)
    .where(and(
      eq(connectedSocialAccounts.userId, userId),
      eq(connectedSocialAccounts.provider, provider),
    ));

  return { accessToken };
}

/**
 * Lista las cuentas sociales del user (SAFE — sin tokens). Solo llamado
 * desde server components/queries que serializan a UI.
 */
export async function getConnectedAccountsSafe(userId: string): Promise<SafeSocialAccountRow[]> {
  return db
    .select({
      id: connectedSocialAccounts.id,
      provider: connectedSocialAccounts.provider,
      providerUserId: connectedSocialAccounts.providerUserId,
      username: connectedSocialAccounts.username,
      avatarUrl: connectedSocialAccounts.avatarUrl,
      scopes: connectedSocialAccounts.scopes,
      expiresAt: connectedSocialAccounts.expiresAt,
      createdAt: connectedSocialAccounts.createdAt,
      updatedAt: connectedSocialAccounts.updatedAt,
    })
    .from(connectedSocialAccounts)
    .where(eq(connectedSocialAccounts.userId, userId));
}

function isUniqueViolation(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  // neon-http a menudo expone { code: '23505' } en el error root o en cause.
  const err = e as { code?: string; cause?: { code?: string }; message?: string };
  if (err.code === '23505') return true;
  if (err.cause?.code === '23505') return true;
  return typeof err.message === 'string' && err.message.includes('23505');
}
