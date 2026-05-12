import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { matches } from '@/db/schema';

export type Match = typeof matches.$inferSelect;

/** Partido activo y destacado para la sidebar de /news. */
export async function getFeaturedMatch(): Promise<Match | null> {
  const rows = await db
    .select()
    .from(matches)
    .where(eq(matches.isFeatured, true))
    .limit(1);
  const row = rows[0];
  if (!row || !row.isActive) return null;
  return row;
}

/** Todos los partidos ordenados por fecha de creación — para el CRM. */
export async function getAllMatches(): Promise<Match[]> {
  return db.select().from(matches).orderBy(desc(matches.createdAt));
}

/** Un partido por ID — para el formulario de edición. */
export async function getMatchById(id: number): Promise<Match | null> {
  const rows = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return rows[0] ?? null;
}
