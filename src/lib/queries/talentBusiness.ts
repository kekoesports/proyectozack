import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talentBusiness, talentVerticals } from '@/db/schema';
import type { TalentBusiness, TalentVertical, TalentVerticalRow, NewTalentBusiness } from '@/types';

/**
 * Datos de negocio de un talent (cláusulas, comisión, condiciones de pago, etc.).
 *
 * @cache none
 * @visibility admin
 * @returns `TalentBusiness` o `null` si el talent aún no tiene fila de negocio.
 */
export async function getTalentBusiness(talentId: number): Promise<TalentBusiness | null> {
  const [row] = await db.select().from(talentBusiness).where(eq(talentBusiness.talentId, talentId)).limit(1);
  return row ?? null;
}

/**
 * Datos de negocio para un conjunto de talents (bulk lookup por ids).
 *
 * @cache none
 * @visibility admin
 * @returns array `TalentBusiness` (puede ser vacío). No incluye talents sin fila de negocio.
 */
export async function listTalentBusiness(talentIds: readonly number[]): Promise<readonly TalentBusiness[]> {
  if (talentIds.length === 0) return [];
  return db.select().from(talentBusiness).where(inArray(talentBusiness.talentId, [...talentIds]));
}

/**
 * Verticales (categorías de contenido) asociadas a un talent.
 *
 * @cache none
 * @visibility admin
 * @returns array de strings `TalentVertical` (puede ser vacío).
 */
export async function getTalentVerticals(talentId: number): Promise<readonly TalentVertical[]> {
  const rows = await db
    .select({ vertical: talentVerticals.vertical })
    .from(talentVerticals)
    .where(eq(talentVerticals.talentId, talentId));
  return rows.map((r) => r.vertical);
}

/**
 * Devuelve todas las filas de la tabla pivote `talent_verticals` (talentId → vertical).
 *
 * @cache none
 * @visibility admin
 * @returns array de `TalentVerticalRow`.
 */
export async function listAllVerticals(): Promise<readonly TalentVerticalRow[]> {
  return db.select().from(talentVerticals);
}

/**
 * Upsert atómico de los datos de negocio de un talent.
 *
 * Implementado vía `INSERT ... ON CONFLICT (talent_id) DO UPDATE` (single statement).
 * Esto elimina la race condition del patrón anterior (lookup + write en dos pasos).
 *
 * @cache none
 * @visibility admin
 * @returns la fila `TalentBusiness` resultante (insertada o actualizada).
 */
export async function upsertTalentBusiness(
  talentId: number,
  patch: Partial<Omit<NewTalentBusiness, 'talentId'>>,
): Promise<TalentBusiness> {
  const [row] = await db
    .insert(talentBusiness)
    .values({ talentId, ...patch })
    .onConflictDoUpdate({
      target: talentBusiness.talentId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  if (!row) throw new Error('Failed to upsert talent business');
  return row;
}

/**
 * Reemplaza las verticales de un talent (delete-all + insert).
 *
 * NOTA: el driver `neon-http` no soporta transacciones Drizzle (`db.transaction`).
 * Bajo contención concurrente extrema (dos admins editando el mismo talent al
 * mismo tiempo) podría dejar estado inconsistente. En la práctica es muy raro
 * (admin tool, baja contención). Para mitigar: el insert usa
 * `onConflictDoNothing` por si la mutación cruzada genera duplicados puntuales.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function setTalentVerticals(
  talentId: number,
  verticals: readonly TalentVertical[],
): Promise<void> {
  await db.delete(talentVerticals).where(eq(talentVerticals.talentId, talentId));
  if (verticals.length === 0) return;
  await db
    .insert(talentVerticals)
    .values(verticals.map((v) => ({ talentId, vertical: v })))
    .onConflictDoNothing();
}
