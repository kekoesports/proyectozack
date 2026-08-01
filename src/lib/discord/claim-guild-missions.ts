import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { platformMissions } from '@/db/schema';
import { DISCORD_GUILD_MEMBER_MODE } from '@/features/giveaway-platform/constants/discord-missions';
import { assertAllowedCoinSourceOrLog } from '@/lib/audit/logBlockedCoinSource';
import { claimMissionAndAward } from '@/lib/giveaway-platform/atomicOperations';
import { logGiveawayEvent } from '@/lib/audit/logGiveawayEvent';
import { fetchDiscordUserGuildIds } from '@/lib/discord/fetch-user-guild-ids';

export type DiscordGuildClaimResult =
  | { ok: true; awarded: Array<{ missionId: number; title: string; rewardCoins: number }> }
  | {
      ok: false;
      code: 'token_expired' | 'api_error' | 'not_in_guild';
      message: string;
    };

/**
 * Verifica membresía Discord y concede todas las misiones activas
 * `discord_guild_member` cuyo target_id está en la lista de guilds del user.
 *
 * Idempotente: claimMissionAndAward usa UNIQUE — re-ejecutar no duplica puntos.
 */
export async function claimDiscordGuildMissionsForUser(input: {
  readonly userId: string;
  readonly accessToken: string;
  /** Si se pasa, solo evalúa esa misión (verify manual). Si no, todas las activas. */
  readonly missionId?: number;
}): Promise<DiscordGuildClaimResult> {
  const guilds = await fetchDiscordUserGuildIds(input.accessToken);
  if (!guilds.ok) {
    if (guilds.code === 'token_expired') {
      return {
        ok: false,
        code: 'token_expired',
        message: 'Discord necesita reconectarse para verificar esta misión.',
      };
    }
    return {
      ok: false,
      code: 'api_error',
      message: 'No hemos podido verificarlo ahora. Inténtalo de nuevo más tarde.',
    };
  }

  const guildSet = new Set(guilds.guildIds);

  const missions = input.missionId
    ? await db
        .select()
        .from(platformMissions)
        .where(and(
          eq(platformMissions.id, input.missionId),
          eq(platformMissions.isActive, true),
        ))
        .limit(1)
    : await db
        .select()
        .from(platformMissions)
        .where(and(
          eq(platformMissions.isActive, true),
          eq(platformMissions.provider, 'discord'),
          eq(platformMissions.verificationMode, DISCORD_GUILD_MEMBER_MODE),
        ));

  const awarded: Array<{ missionId: number; title: string; rewardCoins: number }> = [];

  for (const mission of missions) {
    if (
      mission.provider !== 'discord'
      || mission.verificationMode !== DISCORD_GUILD_MEMBER_MODE
      || !mission.targetId
    ) {
      continue;
    }
    if (!guildSet.has(mission.targetId)) continue;

    await assertAllowedCoinSourceOrLog('mision', {
      userId: input.userId,
      action: 'mission_claim',
      refType: 'mission',
      refId: mission.id,
    });

    const claimedNow = await claimMissionAndAward({
      userId: input.userId,
      missionId: mission.id,
      title: mission.title,
      rewardCoins: mission.rewardCoins,
    });

    if (claimedNow) {
      awarded.push({
        missionId: mission.id,
        title: mission.title,
        rewardCoins: mission.rewardCoins,
      });
      await logGiveawayEvent({
        userId: input.userId,
        action: 'mission_claim',
        outcome: 'success',
        refType: 'mission',
        refId: mission.id,
        metadata: { provider: 'discord', rewardCoins: mission.rewardCoins, via: 'guild_claim' },
      });
    }
  }

  if (awarded.length === 0) {
    // Si pedían una misión concreta y no está en el guild → not_in_guild.
    if (input.missionId) {
      return {
        ok: false,
        code: 'not_in_guild',
        message: 'No hemos detectado que estés dentro del Discord todavía. Únete con "Abrir Discord", espera unos segundos y vuelve a verificar.',
      };
    }
    return {
      ok: false,
      code: 'not_in_guild',
      message: 'Cuenta Discord conectada. Únete al servidor del creador y pulsa Verificar misión.',
    };
  }

  return { ok: true, awarded };
}
