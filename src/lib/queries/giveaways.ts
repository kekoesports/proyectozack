import { eq, gt, isNull, lte, or, desc, asc, and, isNotNull, not, like, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { giveaways } from '@/db/schema';
import type { Giveaway, GiveawayWithTalent } from '@/types';

/**
 * Sorteos activos (endsAt > now) de un talent, ordenados por endsAt ASC, para la ficha pública del creador.
 *
 * @cache none
 * @visibility public
 * @returns array de Giveaway (puede ser vacío). Nunca null.
 */
export async function getActiveGiveaways(talentId: number): Promise<Giveaway[]> {
  return db
    .select()
    .from(giveaways)
    .where(
      and(
        eq(giveaways.talentId, talentId),
        or(isNull(giveaways.endsAt), gt(giveaways.endsAt, new Date())),
        not(like(giveaways.title, '[DEMO]%')), // ocultar demos en público
      ),
    )
    .orderBy(asc(giveaways.endsAt));
}

/**
 * Sorteos ya finalizados (endsAt <= now) de un talent, ordenados por endsAt DESC, para historial en la ficha pública.
 *
 * @cache none
 * @visibility public
 * @returns array de Giveaway (puede ser vacío). Nunca null.
 */
export async function getFinishedGiveaways(talentId: number): Promise<Giveaway[]> {
  return db
    .select()
    .from(giveaways)
    .where(
      and(
        eq(giveaways.talentId, talentId),
        isNotNull(giveaways.endsAt),
        lte(giveaways.endsAt, new Date()),
        not(like(giveaways.title, '[DEMO]%')), // ocultar demos en público
      ),
    )
    .orderBy(desc(giveaways.endsAt));
}

/**
 * Lista todos los sorteos (sin filtro temporal) con su talent, ordenados por createdAt DESC, para el panel admin.
 *
 * @cache none
 * @visibility admin
 * @returns array de GiveawayWithTalent (puede ser vacío). Nunca null.
 */
export async function getAllGiveaways(): Promise<GiveawayWithTalent[]> {
  const rows = await db.query.giveaways.findMany({
    with: { talent: true },
    orderBy: (g, { desc }) => [desc(g.createdAt)],
  });
  return rows;
}

/**
 * Inserta un nuevo sorteo en la BD, invocado desde el panel admin.
 *
 * @cache none
 * @visibility admin
 * @returns Giveaway recién creado (nunca undefined; lanza si insert no devuelve fila).
 */
export async function createGiveaway(data: {
  talentId: number;
  title: string;
  description?: string | null | undefined;
  imageUrl?: string | null | undefined;
  brandName: string;
  brandLogo?: string | null | undefined;
  value?: string | null | undefined;
  redirectUrl: string;
  startsAt: Date;
  endsAt?: Date | null;
  sortOrder?: number;
}): Promise<Giveaway> {
  const [row] = await db.insert(giveaways).values(data).returning();
  if (!row) throw new Error('createGiveaway: insert returned no row');
  return row;
}

/**
 * Actualiza campos de un sorteo existente y refresca `updatedAt`, invocado desde el panel admin.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function updateGiveaway(
  id: number,
  data: Partial<typeof giveaways.$inferInsert>,
): Promise<void> {
  await db.update(giveaways).set({ ...data, updatedAt: new Date() }).where(eq(giveaways.id, id));
}

/**
 * Elimina un sorteo por id, invocado desde el panel admin.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function deleteGiveaway(id: number): Promise<void> {
  await db.delete(giveaways).where(eq(giveaways.id, id));
}
