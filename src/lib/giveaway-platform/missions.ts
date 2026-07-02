import { count, countDistinct, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  coinTransactions,
  dailyStreaks,
  giveawayEntries,
  giveaways,
  missionClaims,
  platformMissions,
} from '@/db/schema';

/**
 * Evalúa las misiones activas de un usuario contra datos reales de BD
 * y acredita las completadas que aún no se hayan cobrado.
 *
 * Idempotente: el UNIQUE (mission_id, user_id) de mission_claims hace
 * que un segundo intento de cobro falle en el INSERT y no acredite
 * monedas duplicadas (patrón necesario con el driver neon-http, que
 * no soporta transacciones interactivas).
 *
 * @returns misiones recién cobradas en esta pasada (para toasts en UI).
 */
export async function evaluateAndClaimMissions(
  userId: string,
): Promise<{ id: number; title: string; rewardCoins: number }[]> {
  const missions = await db.query.platformMissions.findMany({
    where: eq(platformMissions.isActive, true),
  });
  if (missions.length === 0) return [];

  const [entriesTotal] = await db
    .select({ n: count() })
    .from(giveawayEntries)
    .where(eq(giveawayEntries.userId, userId));
  const [distinctCreators] = await db
    .select({ n: countDistinct(giveaways.talentId) })
    .from(giveawayEntries)
    .innerJoin(giveaways, eq(giveaways.id, giveawayEntries.giveawayId))
    .where(eq(giveawayEntries.userId, userId));
  const streak = await db.query.dailyStreaks.findFirst({
    where: eq(dailyStreaks.userId, userId),
  });
  const claims = await db
    .select({ missionId: missionClaims.missionId })
    .from(missionClaims)
    .where(eq(missionClaims.userId, userId));
  const claimedSet = new Set(claims.map((c) => c.missionId));

  const progressFor = (conditionType: string): number => {
    if (conditionType === 'entries_total') return entriesTotal?.n ?? 0;
    if (conditionType === 'distinct_creators') return distinctCreators?.n ?? 0;
    if (conditionType === 'streak_days') return streak?.currentDay ?? 0;
    return 0;
  };

  const newlyClaimed: { id: number; title: string; rewardCoins: number }[] = [];

  for (const mission of missions) {
    if (claimedSet.has(mission.id)) continue;
    if (progressFor(mission.conditionType) < mission.goal) continue;

    // 1) Reclamar (el UNIQUE nos protege de carreras).
    const inserted = await db
      .insert(missionClaims)
      .values({ missionId: mission.id, userId })
      .onConflictDoNothing()
      .returning({ id: missionClaims.id });
    if (inserted.length === 0) continue; // otra petición lo cobró antes

    // 2) Acreditar monedas (solo si el claim fue nuestro).
    await db.insert(coinTransactions).values({
      userId,
      amount: mission.rewardCoins,
      source: 'mision',
      concept: `Misión completada · ${mission.title}`,
      refId: mission.id,
    });
    newlyClaimed.push({ id: mission.id, title: mission.title, rewardCoins: mission.rewardCoins });
  }

  return newlyClaimed;
}
