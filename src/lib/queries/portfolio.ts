import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { portfolioItems } from '@/db/schema';
import type { PortfolioItem } from '@/types';

/**
 * Lista items del portfolio (opcionalmente filtrados por tipo) ordenados por sortOrder ASC, para la sección portfolio de la home.
 *
 * @cache none
 * @visibility public
 * @returns array de PortfolioItem (puede ser vacío). Nunca null.
 */
export async function getPortfolioItems(type?: 'thumb' | 'video' | 'campaign'): Promise<PortfolioItem[]> {
  return db.query.portfolioItems.findMany({
    where: type ? eq(portfolioItems.type, type) : undefined,
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });
}
