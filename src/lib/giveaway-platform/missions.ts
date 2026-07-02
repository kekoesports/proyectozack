import { and, count, countDistinct, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  coinTransactions,
  dailyStreaks,
  giveawayEntries,
  giveaways,
  missionClaims,
  platformMissions,
  redemptions,
} from '@/db/schema';
import { startOfCurrentMonthUtc, type MissionConditionType } from './constants';

/**
 * Estado agregado del progreso de un usuario contra todas las condition
 * types soportadas por el motor. Se calcula UNA vez y se reutiliza tanto
 * en el motor (`evaluateAndClaimMissions`) como en la query de UI
 * (`getMissionsWithProgress`) — evita duplicar SQL.
 */
export interface MissionProgressState {
  entriesTotal: number;
  entriesThisMonth: number;
  distinctCreators: number;
  streakDays: number;
  redemptionsTotal: number;
  claimedMissionIds: Set<number>;
}

/**
 * Carga el estado de progreso de misiones de un usuario en 1 pasada
 * paralela de queries. Todas independientes: `Promise.all` es seguro
 * (neon-http soporta múltiples requests concurrentes).
 */
export async function loadMissionProgress(userId: string): Promise<MissionProgressState> {
  const monthStart = startOfCurrentMonthUtc();
  const [
    entriesTotalRows,
    entriesThisMonthRows,
    distinctCreatorsRows,
    redemptionsRows,
    streak,
    claims,
  ] = await Promise.all([
    db.select({ n: count() }).from(giveawayEntries).where(eq(giveawayEntries.userId, userId)),
    db.select({ n: count() })
      .from(giveawayEntries)
      .where(and(
        eq(giveawayEntries.userId, userId),
        gte(giveawayEntries.createdAt, monthStart),
      )),
    db.select({ n: countDistinct(giveaways.talentId) })
      .from(giveawayEntries)
      .innerJoin(giveaways, eq(giveaways.id, giveawayEntries.giveawayId))
      .where(eq(giveawayEntries.userId, userId)),
    db.select({ n: count() }).from(redemptions).where(eq(redemptions.userId, userId)),
    db.query.dailyStreaks.findFirst({ where: eq(dailyStreaks.userId, userId) }),
    db.select({ missionId: missionClaims.missionId })
      .from(missionClaims)
      .where(eq(missionClaims.userId, userId)),
  ]);

  return {
    entriesTotal: entriesTotalRows[0]?.n ?? 0,
    entriesThisMonth: entriesThisMonthRows[0]?.n ?? 0,
    distinctCreators: distinctCreatorsRows[0]?.n ?? 0,
    streakDays: streak?.currentDay ?? 0,
    redemptionsTotal: redemptionsRows[0]?.n ?? 0,
    claimedMissionIds: new Set(claims.map((c) => c.missionId)),
  };
}

/**
 * Devuelve el progreso (número) del usuario contra una condition type.
 * Función pura sobre el estado ya cargado — testeable en aislamiento.
 */
export function progressFor(state: MissionProgressState, conditionType: string): number {
  switch (conditionType as MissionConditionType) {
    case 'entries_total':      return state.entriesTotal;
    case 'entries_this_month': return state.entriesThisMonth;
    case 'distinct_creators':  return state.distinctCreators;
    case 'streak_days':        return state.streakDays;
    case 'redemptions_total':  return state.redemptionsTotal;
    default:                   return 0;
  }
}

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

  const state = await loadMissionProgress(userId);
  const newlyClaimed: { id: number; title: string; rewardCoins: number }[] = [];

  for (const mission of missions) {
    if (state.claimedMissionIds.has(mission.id)) continue;
    if (progressFor(state, mission.conditionType) < mission.goal) continue;

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
