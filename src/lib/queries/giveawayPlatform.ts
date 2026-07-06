import { and, count, desc, eq, gt, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  coinTransactions,
  giveawayEntries,
  giveawayWinners,
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
  FreeRaffleCardData,
  GiveawayWithEntryData,
  MissionWithProgress,
  PointsRankingRow,
  RaffleParticipant,
  RankingRow,
  Redemption,
  ShopItem,
  UserMonthlyStanding,
} from '@/types/giveawayPlatform';

/** Sources positivas que cuentan para el ranking mensual de puntos SocialPro. */
const MONTHLY_RANKING_SOURCES = ['racha', 'mision'] as const;

/** Inicio del mes natural en curso (UTC). */
function currentMonthStartUtc(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function maskName(name: string): string {
  if (!name) return '*****';
  return `${name.slice(0, 1)}*****`;
}

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
 * Total de jugadores distintos con participación este mes. Contexto para el
 * ranking global — permite mostrar "top 10 de 1.234 jugadores".
 *
 * @cache none
 * @visibility public
 */
export async function getMonthlyRankingTotal(): Promise<number> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      total: sql<number>`count(distinct ${giveawayEntries.userId})::int`,
    })
    .from(giveawayEntries)
    .where(gte(giveawayEntries.createdAt, monthStart));
  return row?.total ?? 0;
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

/**
 * Métricas agregadas del usuario para el perfil premium:
 *  - entriesTotal: participaciones totales de por vida
 *  - entriesMonth: participaciones del mes natural en curso
 *  - distinctCreators: creadores distintos en los que ha entrado (all-time)
 *  - redemptionsCount: canjes realizados en tienda (all-time)
 *
 * @cache none
 * @visibility public (propio usuario)
 */
export async function getUserStats(userId: string): Promise<{
  entriesTotal: number;
  entriesMonth: number;
  distinctCreators: number;
  redemptionsCount: number;
}> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [entriesTotalRow, entriesMonthRow, creatorsRow, redemptionsRow] = await Promise.all([
    db
      .select({ n: count(giveawayEntries.id) })
      .from(giveawayEntries)
      .where(eq(giveawayEntries.userId, userId)),
    db
      .select({ n: count(giveawayEntries.id) })
      .from(giveawayEntries)
      .where(and(eq(giveawayEntries.userId, userId), gte(giveawayEntries.createdAt, monthStart))),
    db
      .select({ n: sql<number>`count(distinct ${giveaways.talentId})::int` })
      .from(giveawayEntries)
      .innerJoin(giveaways, eq(giveaways.id, giveawayEntries.giveawayId))
      .where(eq(giveawayEntries.userId, userId)),
    db
      .select({ n: count(redemptions.id) })
      .from(redemptions)
      .where(eq(redemptions.userId, userId)),
  ]);

  return {
    entriesTotal: entriesTotalRow[0]?.n ?? 0,
    entriesMonth: entriesMonthRow[0]?.n ?? 0,
    distinctCreators: creatorsRow[0]?.n ?? 0,
    redemptionsCount: redemptionsRow[0]?.n ?? 0,
  };
}

/**
 * Fila `player_profiles` del usuario. Puede ser `null` si aún no se generó
 * (caso teórico: Steam OpenID crea la fila en el hook post-signup).
 *
 * @cache none
 * @visibility public (propio usuario)
 */
export async function getPlayerProfile(userId: string) {
  return db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.userId, userId),
  });
}

// =============================================================================
// Hub de Recompensas — sorteos gratis + ranking mensual por puntos
// =============================================================================

/**
 * Ranking mensual de puntos SocialPro. Cuenta solo puntos POSITIVOS
 * ganados en el mes natural en curso, de sources `racha` y `mision`.
 *
 * Excluye por diseño:
 *   - `sorteo` — la fuente histórica de +20⭐ por entry. No queremos que
 *     participar en sorteos infle el ranking (los "sorteos gratis" nuevos
 *     entry_award_coins=0 tampoco crean coin_transactions).
 *   - `tienda` — canjes negativos.
 *   - `admin` — grants manuales, se dejan fuera para evitar manipulación.
 *
 * Respeta `player_profiles.isPrivate` enmascarando el nick a `k*****`.
 *
 * @cache none
 * @visibility public
 */
export async function getMonthlyPointsRanking(limit = 10): Promise<PointsRankingRow[]> {
  const monthStart = currentMonthStartUtc();
  const rows = await db
    .select({
      userId: coinTransactions.userId,
      name: user.name,
      image: user.image,
      isPrivate: playerProfiles.isPrivate,
      pointsEarned: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)::int`,
    })
    .from(coinTransactions)
    .innerJoin(user, eq(user.id, coinTransactions.userId))
    .leftJoin(playerProfiles, eq(playerProfiles.userId, coinTransactions.userId))
    .where(and(
      gt(coinTransactions.amount, 0),
      inArray(coinTransactions.source, MONTHLY_RANKING_SOURCES as unknown as string[]),
      gte(coinTransactions.createdAt, monthStart),
    ))
    .groupBy(coinTransactions.userId, user.name, user.image, playerProfiles.isPrivate)
    .orderBy(desc(sql`sum(${coinTransactions.amount})`))
    .limit(limit);

  return rows.map((r) => ({
    userId: r.userId,
    displayName: r.isPrivate === false ? r.name : maskName(r.name),
    avatarUrl: r.isPrivate === false ? r.image : null,
    pointsEarned: r.pointsEarned,
  }));
}

/** Total de jugadores distintos con puntos ganados este mes (sources del ranking). */
export async function getMonthlyPointsRankingTotal(): Promise<number> {
  const monthStart = currentMonthStartUtc();
  const [row] = await db
    .select({ total: sql<number>`count(distinct ${coinTransactions.userId})::int` })
    .from(coinTransactions)
    .where(and(
      gt(coinTransactions.amount, 0),
      inArray(coinTransactions.source, MONTHLY_RANKING_SOURCES as unknown as string[]),
      gte(coinTransactions.createdAt, monthStart),
    ));
  return row?.total ?? 0;
}

/**
 * Posición del usuario en el ranking mensual + puntos ganados del mes.
 * `rank` es null si el usuario no ha ganado puntos este mes.
 *
 * @cache none
 * @visibility public (propio usuario)
 */
export async function getUserMonthlyStanding(userId: string): Promise<UserMonthlyStanding> {
  const monthStart = currentMonthStartUtc();
  const [me] = await db
    .select({
      pointsEarned: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)::int`,
    })
    .from(coinTransactions)
    .where(and(
      eq(coinTransactions.userId, userId),
      gt(coinTransactions.amount, 0),
      inArray(coinTransactions.source, MONTHLY_RANKING_SOURCES as unknown as string[]),
      gte(coinTransactions.createdAt, monthStart),
    ));

  const myPoints = me?.pointsEarned ?? 0;
  if (myPoints === 0) {
    const total = await getMonthlyPointsRankingTotal();
    return { rank: null, pointsEarned: 0, totalParticipants: total };
  }

  // Cuenta usuarios con MÁS puntos que yo — rank = ese conteo + 1.
  const [row] = await db
    .select({ higher: sql<number>`count(*)::int` })
    .from(
      db
        .select({
          userId: coinTransactions.userId,
          pts: sql<number>`sum(${coinTransactions.amount})`.as('pts'),
        })
        .from(coinTransactions)
        .where(and(
          gt(coinTransactions.amount, 0),
          inArray(coinTransactions.source, MONTHLY_RANKING_SOURCES as unknown as string[]),
          gte(coinTransactions.createdAt, monthStart),
        ))
        .groupBy(coinTransactions.userId)
        .as('agg'),
    )
    .where(sql`agg.pts > ${myPoints}`);

  const total = await getMonthlyPointsRankingTotal();
  return { rank: (row?.higher ?? 0) + 1, pointsEarned: myPoints, totalParticipants: total };
}

/**
 * Sorteos gratis activos de un talent (entry_award_coins = 0).
 * Incluye contador de participantes, si el usuario ya entró y el ganador
 * si el sorteo ya terminó.
 *
 * @cache none
 * @visibility public
 */
export async function getFreeRafflesForCreator(
  talentId: number,
  userId: string | null,
): Promise<FreeRaffleCardData[]> {
  const rows = await db
    .select({
      id: giveaways.id,
      title: giveaways.title,
      description: giveaways.description,
      imageUrl: giveaways.imageUrl,
      rewardName: giveaways.value,
      brandName: giveaways.brandName,
      endsAt: giveaways.endsAt,
      status: giveaways.status,
      entryCount: count(giveawayEntries.id),
    })
    .from(giveaways)
    .leftJoin(giveawayEntries, eq(giveawayEntries.giveawayId, giveaways.id))
    .where(and(
      eq(giveaways.talentId, talentId),
      eq(giveaways.entryAwardCoins, 0),
      inArray(giveaways.status, ['active', 'ended']),
    ))
    .groupBy(giveaways.id)
    .orderBy(desc(giveaways.isFeatured), giveaways.sortOrder);

  if (rows.length === 0) return [];

  const winnersRows = await db
    .select({
      giveawayId: giveawayWinners.giveawayId,
      winnerName: giveawayWinners.winnerName,
      winnerAvatar: giveawayWinners.winnerAvatar,
    })
    .from(giveawayWinners)
    .where(inArray(giveawayWinners.giveawayId, rows.map((r) => r.id)))
    .orderBy(desc(giveawayWinners.wonAt));
  const winnersByGiveaway = new Map(winnersRows.map((w) => [w.giveawayId, w]));

  let mineSet = new Set<number>();
  if (userId) {
    const mine = await db
      .select({ giveawayId: giveawayEntries.giveawayId })
      .from(giveawayEntries)
      .where(and(
        eq(giveawayEntries.userId, userId),
        inArray(giveawayEntries.giveawayId, rows.map((r) => r.id)),
      ));
    mineSet = new Set(mine.map((m) => m.giveawayId));
  }

  return rows.map((r) => {
    const w = winnersByGiveaway.get(r.id);
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      rewardName: r.rewardName ?? r.brandName,
      endsAt: r.endsAt,
      status: r.status as FreeRaffleCardData['status'],
      entryCount: r.entryCount,
      userHasEntered: mineSet.has(r.id),
      winner: w ? { displayName: w.winnerName, avatarUrl: w.winnerAvatar } : null,
    };
  });
}

/**
 * Participantes públicos de un sorteo, respetando `player_profiles.isPrivate`.
 * NO devuelve nunca email, tradeUrl, steamId ni IP.
 *
 * @cache none
 * @visibility public
 */
export async function getRaffleParticipants(
  giveawayId: number,
  limit = 12,
  offset = 0,
): Promise<RaffleParticipant[]> {
  const rows = await db
    .select({
      userId: giveawayEntries.userId,
      name: user.name,
      image: user.image,
      isPrivate: playerProfiles.isPrivate,
      enteredAt: giveawayEntries.createdAt,
    })
    .from(giveawayEntries)
    .innerJoin(user, eq(user.id, giveawayEntries.userId))
    .leftJoin(playerProfiles, eq(playerProfiles.userId, giveawayEntries.userId))
    .where(eq(giveawayEntries.giveawayId, giveawayId))
    .orderBy(desc(giveawayEntries.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    userId: r.userId,
    displayName: r.isPrivate === false ? r.name : maskName(r.name),
    avatarUrl: r.isPrivate === false ? r.image : null,
    enteredAt: r.enteredAt,
  }));
}

/** Total de participantes en un sorteo. */
export async function getRaffleParticipantsCount(giveawayId: number): Promise<number> {
  const [row] = await db
    .select({ n: count(giveawayEntries.id) })
    .from(giveawayEntries)
    .where(eq(giveawayEntries.giveawayId, giveawayId));
  return row?.n ?? 0;
}
