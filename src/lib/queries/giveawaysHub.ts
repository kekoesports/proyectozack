import { gt, lte, and, not, like, or, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { giveaways } from '@/db/schema';
import type { CreatorCodeWithTalent, GiveawayWithTalent } from '@/types';

export type BrandOption = {
  readonly name: string;
  readonly logo: string | null;
  readonly count: number;
};

/**
 * Todos los sorteos activos (endsAt > now) con talent asociado, ordenados por endsAt ASC, para el hub público de sorteos.
 *
 * @cache none
 * @visibility public
 * @returns array de GiveawayWithTalent (puede ser vacío). Nunca null.
 */
const NO_DEMO = not(like(giveaways.title, '[DEMO]%'));

export async function getAllActiveGiveaways(): Promise<GiveawayWithTalent[]> {
  const rows = await db.query.giveaways.findMany({
    // endsAt null = sin fecha de fin = activo indefinidamente (igual que en perfil de talento)
    where: and(or(isNull(giveaways.endsAt), gt(giveaways.endsAt, new Date())), NO_DEMO),
    with: { talent: true },
    orderBy: (g, { asc, desc }) => [desc(g.isFeatured), asc(g.sortOrder), asc(g.endsAt)],
  });
  return rows as GiveawayWithTalent[];
}

/**
 * Todos los sorteos finalizados (endsAt <= now) con talent, ordenados por endsAt DESC, para el archivo público del hub.
 *
 * @cache none
 * @visibility public
 * @returns array de GiveawayWithTalent (puede ser vacío). Nunca null.
 */
export async function getAllFinishedGiveaways(): Promise<GiveawayWithTalent[]> {
  const rows = await db.query.giveaways.findMany({
    where: and(lte(giveaways.endsAt, new Date()), NO_DEMO),
    with: { talent: true },
    orderBy: (g, { desc }) => [desc(g.endsAt)],
  });
  return rows as GiveawayWithTalent[];
}

/**
 * Combina sorteos y códigos para extraer marcas únicas con conteo agregado, ordenadas por count DESC, para los filtros del hub.
 *
 * @cache none
 * @visibility public
 * @returns array de BrandOption `{ name, logo, count }` (puede ser vacío). Nunca null.
 */
export function extractUniqueBrands(
  giveaways: readonly GiveawayWithTalent[],
  codes: readonly CreatorCodeWithTalent[] = [],
): BrandOption[] {
  const map = new Map<string, { logo: string | null; count: number }>();
  const bump = (name: string, logo: string | null): void => {
    const current = map.get(name);
    if (current) {
      current.count += 1;
      if (!current.logo && logo) current.logo = logo;
      return;
    }
    map.set(name, { logo, count: 1 });
  };
  for (const g of giveaways) bump(g.brandName, g.brandLogo);
  for (const c of codes) bump(c.brandName, c.brandLogo);
  return Array.from(map, ([name, { logo, count }]) => ({ name, logo, count })).sort(
    (a, b) => b.count - a.count,
  );
}
