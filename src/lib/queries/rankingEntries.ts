import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rankingEntries } from '@/db/schema';

/** Top 5 para el widget de sidebar. */
export async function getTopRanking(limit = 5) {
  return db.select().from(rankingEntries).orderBy(asc(rankingEntries.position)).limit(limit);
}

/** Todos para el admin. */
export async function getAllRankingEntries() {
  return db.select().from(rankingEntries).orderBy(asc(rankingEntries.position));
}
