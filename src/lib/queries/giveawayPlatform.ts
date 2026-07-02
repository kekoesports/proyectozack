import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  coinTransactions,
  giveawayEntries,
  giveaways,
  platformMissions,
  playerProfiles,
  redemptions,
  shopItems,
  user,
} from '@/db/schema';
import { loadMissionProgress, progressFor } from '@/lib/giveaway-platform/missions';
import type {
  CoinTransaction,
  GiveawayWithEntryData,
  MissionWithProgress,
  RankingRow,
  Redemption,
  ShopItem,
} from '@/types/giveawayPlatform';

/**
 * Saldo de monedas de un usuario = SUM(amount) del libro mayor.
 *
 * @cache none
 * @visibility public (propio usuario)
 * @returns número entero >= 0 en condiciones normales.
 */
export async function getCoinBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)::int` })
    .from(coinTransactions)
    .where(eq(coinTransactions.userId, userId));
  return row?.balance ?? 0;
}

/**
 * Sorteos activos de un talent con contador de participantes y si el usuario ya entró.
 *
 * @cache none
 * @visibility public
 * @returns array (puede ser vacío). Nunca null.
 */
export async function getGiveawaysWithEntryData(
  talentId: number,
  userId: string | null,
): Promise<GiveawayWithEntryData[]> {
  const rows = await db
    .select({
      id: giveaways.id,
      title: giveaways.title,
      description: giveaways.description,
      imageUrl: giveaways.imageUrl,
      brandName: giveaways.brandName,
      value: giveaways.value,
      endsAt: giveaways.endsAt,
      talentId: giveaways.talentId,
      entryCount: count(giveawayEntries.id),
    })
    .from(giveaways)
    .leftJoin(giveawayEntries, eq(giveawayEntries.giveawayId, giveaways.id))
    .where(eq(giveaways.talentId, talentId))
    .groupBy(giveaways.id)
    .orderBy(desc(giveaways.isFeatured), giveaways.sortOrder);

  if (!userId || rows.length === 0) {
    return rows.map((r) => ({ ...r, userHasEntered: false }));
  }
  const mine = await db
    .select({ giveawayId: giveawayEntries.giveawayId })
    .from(giveawayEntries)
    .where(and(
      eq(giveawayEntries.userId, userId),
      inArray(giveawayEntries.giveawayId, rows.map((r) => r.id)),
    ));
  const mineSet = new Set(mine.map((m) => m.giveawayId));
  return rows.map((r) => ({ ...r, userHasEntered: mineSet.has(r.id) }));
}

/**
 * Misiones activas con progreso real del usuario (COUNT de entries,
 * COUNT DISTINCT de creadores vía join a giveaways, día de racha).
 *
 * @cache none
 * @visibility public (propio usuario)
 */
export async function getMissionsWithProgress(userId: string): Promise<MissionWithProgress[]> {
  const missions = await db.query.platformMissions.findMany({
    where: eq(platformMissions.isActive, true),
    orderBy: (m, { asc }) => [asc(m.sortOrder)],
  });
  if (missions.length === 0) return [];

  const state = await loadMissionProgress(userId);
  return missions.map((m) => ({
    ...m,
    current: Math.min(progressFor(state, m.conditionType), m.goal),
    claimed: state.claimedMissionIds.has(m.id),
  }));
}

/**
 * Ranking mensual por tickets (entries del mes natural en curso).
 * Respeta player_profiles.is_private enmascarando el nombre (k*****).
 *
 * @cache none
 * @visibility public
 */
export async function getMonthlyRanking(limit = 10): Promise<RankingRow[]> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      userId: giveawayEntries.userId,
      name: user.name,
      isPrivate: playerProfiles.isPrivate,
      tickets: count(giveawayEntries.id),
    })
    .from(giveawayEntries)
    .innerJoin(user, eq(user.id, giveawayEntries.userId))
    .leftJoin(playerProfiles, eq(playerProfiles.userId, giveawayEntries.userId))
    .where(gte(giveawayEntries.createdAt, monthStart))
    .groupBy(giveawayEntries.userId, user.name, playerProfiles.isPrivate)
    .orderBy(desc(count(giveawayEntries.id)))
    .limit(limit);

  return rows.map((r) => ({
    userId: r.userId,
    displayName: r.isPrivate === false ? r.name : `${r.name.slice(0, 1)}*****`,
    tickets: r.tickets,
  }));
}

/**
 * Items de tienda activos con stock, por categoría opcional.
 *
 * @cache none
 * @visibility public
 */
export async function getActiveShopItems(): Promise<ShopItem[]> {
  return db.query.shopItems.findMany({
    where: eq(shopItems.isActive, true),
    orderBy: (s, { asc }) => [asc(s.sortOrder)],
  });
}

/**
 * Historial de transacciones de monedas del usuario, más reciente primero.
 *
 * @cache none
 * @visibility public (propio usuario)
 */
export async function getUserTransactions(userId: string, limit = 50): Promise<CoinTransaction[]> {
  return db.query.coinTransactions.findMany({
    where: eq(coinTransactions.userId, userId),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
    limit,
  });
}

/**
 * Canjes del usuario con su item, más reciente primero.
 *
 * @cache none
 * @visibility public (propio usuario)
 */
export async function getUserRedemptions(userId: string): Promise<(Redemption & { shopItem: ShopItem })[]> {
  return db.query.redemptions.findMany({
    where: eq(redemptions.userId, userId),
    with: { shopItem: true },
    orderBy: (r, { desc: d }) => [d(r.createdAt)],
  }) as Promise<(Redemption & { shopItem: ShopItem })[]>;
}
