'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  coinTransactions,
  missionClaims,
  missionVerificationAttempts,
  platformMissions,
} from '@/db/schema';
import { getConnectedAccount } from '@/lib/queries/connectedSocialAccounts';
import { decrypt } from '@/lib/crypto/token-encryption';
import { DISCORD_GUILD_MEMBER_MODE } from '@/features/giveaway-platform/constants/discord-missions';

/** Shape mínimo del array que devuelve /users/@me/guilds — solo usamos `id`. */
const DiscordGuildListSchema = z.array(z.object({ id: z.string() }).passthrough());

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
 *  - Fetch a Discord `GET /users/@me/guilds` con el token. Filtra por
 *    `target_id` (guild objetivo). No persiste la lista de guilds.
 *  - Si es miembro → INSERT mission_claim (UNIQUE bloquea doble claim)
 *    + INSERT coin_transactions con source='mision'.
 *  - Todos los outcomes se registran en `mission_verification_attempts`
 *    para auditoría + rate limit.
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
    return { ok: false, code: 'rate_limited', message: `Espera ${RATE_LIMIT_SECONDS}s antes de volver a verificar` };
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

  // Fetch guilds del usuario. NO persistimos la lista.
  let guilds: { id: string }[];
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (res.status === 401) {
      await recordAttempt(missionId, user.id, 'token_expired');
      return { ok: false, code: 'token_expired', message: 'Discord necesita reconectarse para verificar esta misión.' };
    }
    if (!res.ok) {
      await recordAttempt(missionId, user.id, 'api_error');
      return { ok: false, code: 'api_error', message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.' };
    }
    const data: unknown = await res.json();
    const parsed = DiscordGuildListSchema.safeParse(data);
    if (!parsed.success) {
      await recordAttempt(missionId, user.id, 'api_error');
      return { ok: false, code: 'api_error', message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.' };
    }
    guilds = parsed.data;
  } catch {
    await recordAttempt(missionId, user.id, 'api_error');
    return { ok: false, code: 'api_error', message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.' };
  }

  const isMember = guilds.some((g) => g.id === mission.targetId);
  if (!isMember) {
    await recordAttempt(missionId, user.id, 'not_verified');
    return { ok: false, code: 'not_verified', message: 'No hemos detectado que estés dentro del Discord todavía.' };
  }

  // Cumple: INSERT claim + coin_transactions. El UNIQUE bloquea el
  // doble claim en caso de race condition.
  // El UNIQUE `mission_claims_mission_user_uq` sobre (mission_id, user_id)
  // hace que un race no duplique. `onConflictDoNothing()` sin `target`
  // captura cualquier violación de constraint sobre esta fila.
  const [claim] = await db
    .insert(missionClaims)
    .values({ missionId, userId: user.id })
    .onConflictDoNothing()
    .returning({ id: missionClaims.id });

  if (!claim) {
    // Ya había uno por race — considerar reclamado.
    await recordAttempt(missionId, user.id, 'success');
    return { ok: false, code: 'already_claimed', message: 'Ya has reclamado esta misión' };
  }

  await db.insert(coinTransactions).values({
    userId: user.id,
    amount: mission.rewardCoins,
    source: 'mision',
    concept: `Misión: ${mission.title}`,
    refId: missionId,
  });

  await recordAttempt(missionId, user.id, 'success');
  revalidatePath('/sorteos', 'layout');
  return { ok: true, code: 'success', rewardCoins: mission.rewardCoins };
}
