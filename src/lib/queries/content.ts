import { db } from '@/lib/db';
import { brands, collaborators, teamMembers } from '@/db/schema';
import { resolveBrandLogo } from '@/lib/brandAssets';
import type {
  Brand,
  Collaborator,
  TeamMember,
} from '@/types';

/**
 * Lista de marcas (brands) ordenadas por sortOrder ASC, para el carrusel/marquee de la home.
 *
 * @cache none
 * @visibility public
 * @returns array de Brand (puede ser vacío). Nunca null.
 */
export async function getBrands(): Promise<Brand[]> {
  const rows = await db.query.brands.findMany({
    orderBy: (b, { asc }) => [asc(b.sortOrder)],
  });
  return rows.map((b) => ({
    ...b,
    logoUrl: b.logoUrl ?? resolveBrandLogo(b.displayName),
  }));
}

/**
 * Lista de colaboradores ordenados por sortOrder ASC, para la sección de partners/collabs en la home.
 *
 * @cache none
 * @visibility public
 * @returns array de Collaborator (puede ser vacío). Nunca null.
 */
export async function getCollaborators(): Promise<Collaborator[]> {
  return db.query.collaborators.findMany({
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });
}

/**
 * Lista de miembros del equipo (team members) ordenados por sortOrder ASC, para la sección "Equipo" de la home.
 *
 * @cache none
 * @visibility public
 * @returns array de TeamMember (puede ser vacío). Nunca null.
 */
export async function getTeam(): Promise<TeamMember[]> {
  return db.query.teamMembers.findMany({
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });
}

// Re-export for convenience
export { brands, collaborators, teamMembers };
