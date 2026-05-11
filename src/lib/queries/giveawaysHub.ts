import { gt, lte, and, not, like, or, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { giveaways } from '@/db/schema';
import type { CreatorCodeWithTalent, GiveawayWithTalent, Talent } from '@/types';

export type BrandOption = {
  readonly name: string;
  readonly logo: string | null;
  readonly count: number;
};

/**
 * Tope de sorteos finalizados servidos al hub público. Limitar evita un payload
 * que crece sin techo según se acumulan sorteos antiguos. Si necesitamos "ver
 * más", añadir una segunda página explícita (searchParam) — no ampliar este cap.
 */
const FINISHED_LIMIT = 50;

const NO_DEMO = not(like(giveaways.title, '[DEMO]%'));

/**
 * Sorteos activos (endsAt > now o sin endsAt) con talent asociado, ordenados por
 * destacados primero / sortOrder ASC / endsAt ASC. Para el hub público `/sorteos`.
 *
 * @cache none
 * @visibility public
 * @returns array de GiveawayWithTalent (puede ser vacío). Nunca null.
 */
export async function getAllActiveGiveaways(): Promise<GiveawayWithTalent[]> {
  const rows = await db.query.giveaways.findMany({
    // endsAt null = sin fecha de fin = activo indefinidamente (igual que en perfil de talento)
    where: and(or(isNull(giveaways.endsAt), gt(giveaways.endsAt, new Date())), NO_DEMO),
    with: { talent: true },
    orderBy: (g, { asc, desc }) => [desc(g.isFeatured), asc(g.sortOrder), asc(g.endsAt)],
  });
  return rows;
}

/**
 * Sorteos finalizados (endsAt <= now) con talent. Limitado a `FINISHED_LIMIT`
 * para acotar el payload del hub público. Si el usuario quiere navegar más
 * antiguos, paginamos en el futuro vía searchParam — NO levantar este límite.
 *
 * @cache none
 * @visibility public
 * @returns array de GiveawayWithTalent (puede ser vacío, top N). Nunca null.
 */
export async function getAllFinishedGiveaways(): Promise<GiveawayWithTalent[]> {
  const rows = await db.query.giveaways.findMany({
    where: and(lte(giveaways.endsAt, new Date()), NO_DEMO),
    with: { talent: true },
    orderBy: (g, { desc }) => [desc(g.endsAt)],
    limit: FINISHED_LIMIT,
  });
  return rows;
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

/**
 * Extrae creadores únicos de un array de giveaways, con su conteo de sorteos, ordenados por count DESC.
 *
 * @cache none
 * @visibility public
 */
export function extractCreators(
  giveaways: readonly GiveawayWithTalent[],
): (Talent & { giveawayCount: number })[] {
  const map = new Map<number, { talent: Talent; count: number }>();
  for (const g of giveaways) {
    const existing = map.get(g.talent.id);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(g.talent.id, { talent: g.talent, count: 1 });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .map(({ talent, count }) => ({ ...talent, giveawayCount: count }));
}
