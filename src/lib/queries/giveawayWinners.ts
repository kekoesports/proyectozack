import { desc, sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { giveawayWinners } from '@/db/schema';
import type { GiveawayWinnerWithGiveaway, GiveawayWinnerFull } from '@/types';

/**
 * Últimos ganadores con su sorteo asociado, ordenados por wonAt DESC, para el hub público de sorteos.
 *
 * @cache none
 * @visibility public
 * @returns array de GiveawayWinnerWithGiveaway (puede ser vacío). Nunca null.
 */
export async function getRecentWinners(limit = 10): Promise<GiveawayWinnerFull[]> {
  const rows = await db.query.giveawayWinners.findMany({
    with: { giveaway: { with: { talent: true } } },
    orderBy: (w, { desc }) => [desc(w.wonAt)],
    limit,
  });
  return rows as unknown as GiveawayWinnerFull[];
}

/**
 * Ganadores de un creador concreto, por talentId, para el perfil público.
 */
export async function getWinnersByTalent(talentId: number, limit = 5): Promise<GiveawayWinnerFull[]> {
  const rows = await db.query.giveawayWinners.findMany({
    with: { giveaway: { with: { talent: true } } },
    where: (_w, { sql }) =>
      sql`${giveawayWinners.giveawayId} IN (SELECT id FROM giveaways WHERE talent_id = ${talentId})`,
    orderBy: (w, { desc }) => [desc(w.wonAt)],
    limit,
  });
  return rows as unknown as GiveawayWinnerFull[];
}

/**
 * Ranking de ganadores agregando wins por (winnerName, winnerAvatar), ordenado por wins DESC, para el leaderboard público.
 *
 * @cache none
 * @visibility public
 * @returns array de `{ winnerName, winnerAvatar, wins }` (puede ser vacío). Nunca null.
 */
export async function getTopWinners(limit = 10): Promise<{ winnerName: string; winnerAvatar: string | null; wins: number }[]> {
  return db
    .select({
      winnerName: giveawayWinners.winnerName,
      winnerAvatar: giveawayWinners.winnerAvatar,
      wins: sql<number>`count(*)::int`.as('wins'),
    })
    .from(giveawayWinners)
    .groupBy(giveawayWinners.winnerName, giveawayWinners.winnerAvatar)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

/**
 * Lista todos los ganadores con su sorteo, ordenados por wonAt DESC, para el panel admin.
 *
 * @cache none
 * @visibility admin
 * @returns array de GiveawayWinnerWithGiveaway (puede ser vacío). Nunca null.
 */
export async function getAllWinners(): Promise<GiveawayWinnerWithGiveaway[]> {
  const rows = await db.query.giveawayWinners.findMany({
    with: { giveaway: true },
    orderBy: (w, { desc }) => [desc(w.wonAt)],
  });
  return rows as GiveawayWinnerWithGiveaway[];
}

/**
 * Inserta un ganador para un sorteo concreto, invocado desde el panel admin al cerrar un sorteo.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function createWinner(data: {
  giveawayId: number;
  winnerName: string;
  winnerAvatar?: string | null | undefined;
  wonAt?: Date;
}): Promise<void> {
  await db.insert(giveawayWinners).values(data);
}

/**
 * Elimina un ganador por id, invocado desde el panel admin.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function deleteWinner(id: number): Promise<void> {
  await db.delete(giveawayWinners).where(eq(giveawayWinners.id, id));
}
