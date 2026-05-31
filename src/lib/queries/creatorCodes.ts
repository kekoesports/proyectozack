import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creatorCodes } from '@/db/schema';
import { resolveCtaUrl } from '@/lib/utils/cta-url';
import type { CreatorCode, CreatorCodeResolved, CreatorCodeWithTalent } from '@/types';

/**
 * Lista todos los códigos promocionales con su talent asociado, ordenados por sortOrder ASC, para el hub de códigos y panel admin.
 *
 * @cache none
 * @visibility both
 * @returns array de CreatorCodeWithTalent (puede ser vacío). Nunca null.
 */
export async function getAllCodes(): Promise<CreatorCodeWithTalent[]> {
  const rows = await db.query.creatorCodes.findMany({
    with: { talent: true, crmBrand: true },
    orderBy: (c, { asc, desc }) => [desc(c.isFeatured), asc(c.sortOrder)],
  });
  return rows.map(({ crmBrand, ...row }) => ({
    ...row,
    ctaUrl: resolveCtaUrl(row.redirectUrl, crmBrand?.mainUrl),
  }));
}

/**
 * Lista los códigos destacados (`isFeatured = true`) con su talent, ordenados por sortOrder ASC, para la home y secciones promocionales.
 *
 * @cache none
 * @visibility public
 * @returns array de CreatorCodeWithTalent (puede ser vacío). Nunca null.
 */
export async function getFeaturedCodes(): Promise<CreatorCodeWithTalent[]> {
  const rows = await db.query.creatorCodes.findMany({
    where: (c, { eq }) => eq(c.isFeatured, true),
    with: { talent: true, crmBrand: true },
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });
  return rows.map(({ crmBrand, ...row }) => ({
    ...row,
    ctaUrl: resolveCtaUrl(row.redirectUrl, crmBrand?.mainUrl),
  }));
}

/**
 * Devuelve los códigos promocionales asociados a un talent concreto, ordenados por sortOrder ASC, para la ficha `/[creatorSlug]`.
 *
 * @cache none
 * @visibility public
 * @returns array de CreatorCodeResolved (puede ser vacío). Nunca null.
 */
export async function getCodesByTalent(talentId: number): Promise<CreatorCodeResolved[]> {
  const rows = await db.query.creatorCodes.findMany({
    where: (c, { eq }) => eq(c.talentId, talentId),
    with: { crmBrand: true },
    orderBy: (c, { desc, asc }) => [desc(c.isFeatured), asc(c.sortOrder)],
  });
  return rows.map(({ crmBrand, ...row }) => ({
    ...row,
    ctaUrl: resolveCtaUrl(row.redirectUrl, crmBrand?.mainUrl),
  }));
}

/**
 * Lista todos los códigos de un talent con su talent asociado, para el panel admin de detalle.
 *
 * @cache none
 * @visibility admin
 * @returns array de CreatorCodeWithTalent (puede ser vacío). Nunca null.
 */
export async function getAdminCodesByTalent(talentId: number): Promise<CreatorCodeWithTalent[]> {
  const rows = await db.query.creatorCodes.findMany({
    where: (c, { eq }) => eq(c.talentId, talentId),
    with: { talent: true, crmBrand: true },
    orderBy: (c, { desc, asc }) => [desc(c.isFeatured), asc(c.sortOrder)],
  });
  return rows.map(({ crmBrand, ...row }) => ({
    ...row,
    ctaUrl: resolveCtaUrl(row.redirectUrl, crmBrand?.mainUrl),
  }));
}

/**
 * Inserta un nuevo código promocional en la BD, usado por el panel admin para asociar un brand a un talent.
 *
 * @cache none
 * @visibility admin
 * @returns CreatorCode recién creado (nunca undefined; lanza si insert no devuelve fila).
 */
export async function createCode(data: {
  talentId: number;
  code: string;
  brandName: string;
  brandLogo?: string | null;
  redirectUrl: string;
  description?: string | null;
  badge?: string | null;
  isFeatured?: boolean;
  category?: string | null;
  ctaText?: string | null;
  sortOrder?: number;
  crmBrandId?: number | null;
}): Promise<CreatorCode> {
  const [row] = await db.insert(creatorCodes).values(data).returning();
  if (!row) throw new Error('createCode: insert returned no row');
  return row;
}

/**
 * Actualiza los campos editables de un código promocional.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function updateCode(
  id: number,
  data: Partial<{
    talentId: number;
    code: string;
    brandName: string;
    brandLogo: string | null;
    redirectUrl: string;
    description: string | null;
    badge: string | null;
    isFeatured: boolean;
    category: string | null;
    ctaText: string | null;
    sortOrder: number;
    crmBrandId: number | null;
  }>,
): Promise<void> {
  await db.update(creatorCodes).set(data).where(eq(creatorCodes.id, id));
}

/**
 * Elimina un código promocional por id, invocado desde el panel admin.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function deleteCode(id: number): Promise<void> {
  await db.delete(creatorCodes).where(eq(creatorCodes.id, id));
}
