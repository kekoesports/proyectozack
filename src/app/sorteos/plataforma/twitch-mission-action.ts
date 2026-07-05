'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import {
  coinTransactions,
  missionClaims,
  missionVerificationAttempts,
  platformMissions,
} from '@/db/schema';
import { getConnectedAccount } from '@/lib/queries/connectedSocialAccounts';
import { decrypt } from '@/lib/crypto/token-encryption';
import { TWITCH_FOLLOW_CHANNEL_MODE } from '@/features/giveaway-platform/constants/twitch-missions';
import { assertAllowedCoinSource } from '@/lib/rewards/allowed-coin-sources';
import { logGiveawayEvent } from '@/lib/audit/logGiveawayEvent';

/**
 * Server action — verifica una misión Twitch (follow al canal) y, si
 * cumple, concede los puntos configurados.
 *
 * Contrato:
 *  - Sesión Better Auth obligatoria (`userId` de sesión).
 *  - Rate limit 30s por (mission_id, user_id) desde el último intento.
 *  - Misión debe existir, estar activa, y ser provider='twitch' +
 *    verification_mode='twitch_follow_channel'.
 *  - Cuenta Twitch del usuario debe estar conectada y no desconectada.
 *  - Access token no expirado.
 *  - Fetch a Twitch Helix `GET /channels/followed?user_id=<connected>&
 *    broadcaster_id=<target>` con el token + Client-Id header.
 *    No persiste la lista de follows.
 *  - Si sigue → INSERT mission_claim (UNIQUE bloquea doble claim)
 *    + INSERT coin_transactions con source='mision'.
 *  - Todos los outcomes se registran en `mission_verification_attempts`
 *    para auditoría + rate limit.
 */

const RATE_LIMIT_SECONDS = 30;

/**
 * Shape esperado de `GET /helix/channels/followed`. Solo miramos si
 * `data` tiene al menos un elemento y su `broadcaster_id` coincide con
 * el target. `total` también viene en la respuesta pero es informativo.
 */
const TwitchFollowedSchema = z.object({
  data: z.array(z.object({ broadcaster_id: z.string() }).passthrough()),
  total: z.number().optional(),
});

export type TwitchVerifyResult =
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

export async function verifyTwitchMission(input: unknown): Promise<TwitchVerifyResult> {
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
  if (mission.provider !== 'twitch' || mission.verificationMode !== TWITCH_FOLLOW_CHANNEL_MODE || !mission.targetId) {
    return { ok: false, code: 'mission_wrong_provider', message: 'Misión mal configurada' };
  }

  const clientId = env.TWITCH_CLIENT_ID;
  if (!clientId) {
    // La misión está sembrada pero la app no tiene client id — estado
    // inconsistente. Tratamos como internal para no filtrar detalles.
    await recordAttempt(missionId, user.id, 'invalid');
    return { ok: false, code: 'internal', message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.' };
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

  // Cuenta Twitch conectada.
  const account = await getConnectedAccount(user.id, 'twitch');
  if (!account) {
    await recordAttempt(missionId, user.id, 'not_connected');
    return { ok: false, code: 'not_connected', message: 'Conecta Twitch para verificar esta misión.' };
  }

  // Token expirado (Twitch dura ~4h, más frecuente que Discord).
  if (account.expiresAt && account.expiresAt.getTime() < Date.now()) {
    await recordAttempt(missionId, user.id, 'token_expired');
    return { ok: false, code: 'token_expired', message: 'Twitch necesita reconectarse para verificar esta misión.' };
  }

  // Descifrar token.
  let accessToken: string;
  try {
    accessToken = decrypt(account.accessTokenEncrypted);
  } catch {
    await recordAttempt(missionId, user.id, 'invalid');
    return { ok: false, code: 'internal', message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.' };
  }

  // Fetch follows del usuario contra el broadcaster objetivo.
  // Helix limita este endpoint a consultar los follows del propio user
  // del token. NO persistimos la lista.
  const followedUrl = new URL('https://api.twitch.tv/helix/channels/followed');
  followedUrl.searchParams.set('user_id', account.providerUserId);
  followedUrl.searchParams.set('broadcaster_id', mission.targetId);

  let follows: { broadcaster_id: string }[];
  try {
    const res = await fetch(followedUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': clientId,
      },
      cache: 'no-store',
    });
    if (res.status === 401) {
      await recordAttempt(missionId, user.id, 'token_expired');
      return { ok: false, code: 'token_expired', message: 'Twitch necesita reconectarse para verificar esta misión.' };
    }
    if (!res.ok) {
      await recordAttempt(missionId, user.id, 'api_error');
      return { ok: false, code: 'api_error', message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.' };
    }
    const data: unknown = await res.json();
    const parsed = TwitchFollowedSchema.safeParse(data);
    if (!parsed.success) {
      await recordAttempt(missionId, user.id, 'api_error');
      return { ok: false, code: 'api_error', message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.' };
    }
    follows = parsed.data.data;
  } catch {
    await recordAttempt(missionId, user.id, 'api_error');
    return { ok: false, code: 'api_error', message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.' };
  }

  const isFollowing = follows.some((f) => f.broadcaster_id === mission.targetId);
  if (!isFollowing) {
    await recordAttempt(missionId, user.id, 'not_verified');
    return { ok: false, code: 'not_verified', message: 'No hemos detectado que sigas el canal todavía.' };
  }

  // Cumple: INSERT claim + coin_transactions. El UNIQUE bloquea el
  // doble claim en caso de race condition.
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

  assertAllowedCoinSource('mision');
  await db.insert(coinTransactions).values({
    userId: user.id,
    amount: mission.rewardCoins,
    source: 'mision',
    concept: `Misión: ${mission.title}`,
    refId: missionId,
  });

  await recordAttempt(missionId, user.id, 'success');

  await logGiveawayEvent({
    userId:  user.id,
    action:  'mission_claim',
    outcome: 'success',
    refType: 'mission',
    refId:   missionId,
    metadata: { provider: 'twitch', rewardCoins: mission.rewardCoins },
  });
  revalidatePath('/sorteos', 'layout');
  return { ok: true, code: 'success', rewardCoins: mission.rewardCoins };
}
