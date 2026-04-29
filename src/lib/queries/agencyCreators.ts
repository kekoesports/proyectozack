import { db } from '@/lib/db';
import { agencyCreators } from '@/db/schema';
import { sql } from 'drizzle-orm';

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

