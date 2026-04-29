import { db } from '@/lib/db';
import { agencyCreators } from '@/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Lista todos los creadores de agencia ordenados por nombre, usado en `/[creatorSlug]` y dashboards.
 *
 * @cache none
 * @visibility public
 * @returns array (puede ser vacío). Nunca null.
 */
export async function getAgencyCreators() {
  return db.select().from(agencyCreators).orderBy(agencyCreators.name);
}

/**
 * Cuenta total de creadores de agencia, usado en métricas y badges de la home/landing.
 *
 * @cache none
 * @visibility public
 * @returns number (0 si no hay filas).
 */
export async function countAgencyCreators(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencyCreators);
  return result[0]?.count ?? 0;
}

/**
 * Lista distinta de países (no nulos ni vacíos) presentes en agencyCreators, para selectores de filtros.
 *
 * @cache none
 * @visibility public
 * @returns array de códigos/nombres de país (puede ser vacío). Nunca null.
 */
export async function getAgencyCreatorCountries(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ country: agencyCreators.country })
    .from(agencyCreators)
    .where(sql`${agencyCreators.country} IS NOT NULL AND ${agencyCreators.country} != ''`)
    .orderBy(agencyCreators.country);
  return rows.map(r => r.country!);
}
