'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { missionClaims, missionVerificationAttempts, platformMissions } from '@/db/schema';
import { getConnectedAccount } from '@/lib/queries/connectedSocialAccounts';
import { decrypt } from '@/lib/crypto/token-encryption';
import { DISCORD_GUILD_MEMBER_MODE } from '@/features/giveaway-platform/constants/discord-missions';
import { claimDiscordGuildMissionsForUser } from '@/lib/discord/claim-guild-missions';

/**
 * Server action — verifica una misión Discord y, si cumple, concede
 * los puntos configurados.
 *
 * Contrato:
 *  - Sesión Better Auth obligatoria (`userId` de sesión).
 *  - Rate limit 30s por (mission_id, user_id) desde el último intento.
 *  - Misión debe existir, estar activa, y ser provider='discord' +
 *    verification_mode='discord_guild_member'.
 *  - Cuenta Discord del usuario debe estar conectada y no desconectada.
 *  - Access token no expirado.
 *  - Fetch paginado a Discord `GET /users/@me/guilds`. Filtra por
 *    `target_id` (guild objetivo). No persiste la lista de guilds.
 *  - Si es miembro → claim + monedas (UNIQUE bloquea doble claim).
 *  - Outcomes en `mission_verification_attempts` para auditoría + rate limit.
 */

const RATE_LIMIT_SECONDS = 30;

export type DiscordVerifyResult =
  | { ok: true; code: 'success'; rewardCoins: number }
  | { ok: false; code:
      | 'unauthenticated'
      | 'mission_not_found'
      | 'mission_wrong_provider'
      | 'not_connected'
      | 'token_expired'
      | 'rate_limited'
      | 'already_claimed'
      | 'not_verified'
      | 'api_error'
      | 'internal';
      message: string;
    };

async function requirePlayerSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

async function recordAttempt(missionId: number, userId: string, outcome: string) {
  try {
    await db.insert(missionVerificationAttempts).values({
      missionId,
      userId,
      outcome,
    });
  } catch {
    // Fallo de auditoría no debe bloquear el flujo — log silencioso.
  }
}

export async function verifyDiscordMission(input: unknown): Promise<DiscordVerifyResult> {
  const user = await requirePlayerSession();
  if (!user) {
    return { ok: false, code: 'unauthenticated', message: 'Inicia sesión con Steam' };
  }

  const missionId = Number.parseInt(String((input as { missionId?: unknown })?.missionId ?? ''), 10);
  if (!Number.isFinite(missionId) || missionId <= 0) {
    return { ok: false, code: 'mission_not_found', message: 'Misión no válida' };
  }

  const [mission] = await db
    .select()
    .from(platformMissions)
    .where(and(eq(platformMissions.id, missionId), eq(platformMissions.isActive, true)))
    .limit(1);
  if (!mission) {
    return { ok: false, code: 'mission_not_found', message: 'Misión no disponible' };
  }
  if (mission.provider !== 'discord' || mission.verificationMode !== DISCORD_GUILD_MEMBER_MODE || !mission.targetId) {
    return { ok: false, code: 'mission_wrong_provider', message: 'Misión mal configurada' };
  }

  // Bloqueo temprano si ya reclamó.
  const [claimed] = await db
    .select({ id: missionClaims.id })
    .from(missionClaims)
    .where(and(eq(missionClaims.missionId, missionId), eq(missionClaims.userId, user.id)))
    .limit(1);
  if (claimed) {
    return { ok: false, code: 'already_claimed', message: 'Ya has reclamado esta misión' };
  }

  // Rate limit por (missionId, user_id) — último intento en <30s.
  const cutoff = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000);
  const [recent] = await db
    .select({ id: missionVerificationAttempts.id })
    .from(missionVerificationAttempts)
    .where(and(
      eq(missionVerificationAttempts.missionId, missionId),
      eq(missionVerificationAttempts.userId, user.id),
      gt(missionVerificationAttempts.attemptedAt, cutoff),
    ))
    .limit(1);
  if (recent) {
    return {
      ok: false,
      code: 'rate_limited',
      message: `Espera unos segundos antes de volver a verificar. Si acabas de unirte al servidor, espera ${RATE_LIMIT_SECONDS}s y vuelve a probar.`,
    };
  }

  // Cuenta Discord conectada.
  const account = await getConnectedAccount(user.id, 'discord');
  if (!account) {
    await recordAttempt(missionId, user.id, 'not_connected');
    return { ok: false, code: 'not_connected', message: 'Conecta Discord para verificar esta misión.' };
  }

  // Token expirado.
  if (account.expiresAt && account.expiresAt.getTime() < Date.now()) {
    await recordAttempt(missionId, user.id, 'token_expired');
    return { ok: false, code: 'token_expired', message: 'Discord necesita reconectarse para verificar esta misión.' };
  }

  // Descifrar token.
  let accessToken: string;
  try {
    accessToken = decrypt(account.accessTokenEncrypted);
  } catch {
    await recordAttempt(missionId, user.id, 'invalid');
    return { ok: false, code: 'internal', message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.' };
  }

  const result = await claimDiscordGuildMissionsForUser({
    userId: user.id,
    accessToken,
    missionId,
  });

  if (!result.ok) {
    if (result.code === 'token_expired') {
      await recordAttempt(missionId, user.id, 'token_expired');
      return { ok: false, code: 'token_expired', message: result.message };
    }
    if (result.code === 'api_error') {
      await recordAttempt(missionId, user.id, 'api_error');
      return { ok: false, code: 'api_error', message: result.message };
    }
    await recordAttempt(missionId, user.id, 'not_verified');
    return { ok: false, code: 'not_verified', message: result.message };
  }

  const award = result.awarded.find((a) => a.missionId === missionId) ?? result.awarded[0];
  if (!award) {
    await recordAttempt(missionId, user.id, 'already_done');
    return { ok: false, code: 'already_claimed', message: 'Ya has reclamado esta misión' };
  }

  await recordAttempt(missionId, user.id, 'success');
  revalidatePath('/sorteos', 'layout');
  return { ok: true, code: 'success', rewardCoins: award.rewardCoins };
}
