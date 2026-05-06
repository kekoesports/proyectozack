import { and, asc, desc, eq, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { crmBrands, crmBrandContacts, crmBrandFollowups, user } from '@/db/schema';
import { needsVisibilityFilter } from '@/lib/permissions';

import type { Role } from '@/lib/auth-guard';
import type { BrandFollowupDerivedStatus } from '@/lib/schemas/crmBrand';
import type {
  CrmBrand,
  CrmBrandContact,
  CrmBrandFollowup,
  CrmBrandFollowupWithBrand,
  CrmBrandWithContacts,
  CrmBrandWithDerived,
  NewCrmBrand,
  NewCrmBrandContact,
  NewCrmBrandFollowup,
} from '@/types';

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Calcula el estado derivado del follow-up de una marca a partir de su `nextFollowupAt`.
 * Comparación a granularidad de día (no hora). Sin `nextFollowupAt` → `sin_followup`.
 *
 * @cache none
 * @visibility admin
 * @returns `'sin_followup' | 'vencido' | 'hoy' | 'pendiente'`.
 */
export function computeFollowupStatus(
  nextFollowupAt: Date | null | undefined,
): BrandFollowupDerivedStatus {
  if (!nextFollowupAt) return 'sin_followup';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const followupDay = new Date(
    nextFollowupAt.getFullYear(),
    nextFollowupAt.getMonth(),
    nextFollowupAt.getDate(),
  );
  if (followupDay < today) return 'vencido';
  if (followupDay.getTime() === today.getTime()) return 'hoy';
  return 'pendiente';
}

// ── Brands ────────────────────────────────────────────────────────────────────

/**
 * Lista marcas del CRM con contacto primario y status de follow-up derivado. Excluye archivadas por defecto.
 * Aplica filtro de visibilidad si el rol lo requiere (staff: created_by o assigned_to).
 *
 * @cache none
 * @visibility admin
 * @scope staff
 * @returns array readonly (puede ser vacío). Nunca null.
 */
export async function listCrmBrands(opts?: {
  userId?: string;
  role?: Role;
  includeArchived?: boolean;
}): Promise<readonly CrmBrandWithDerived[]> {
  const { userId, role, includeArchived = false } = opts ?? {};

  const visibilityCondition =
    userId && role && needsVisibilityFilter(role)
      ? or(
          eq(crmBrands.assignedToUserId, userId),
          eq(crmBrands.coAssignedToUserId, userId),
          eq(crmBrands.createdByUserId, userId),
        )
      : undefined;

  const archivedCondition = includeArchived
    ? undefined
    : ne(crmBrands.status, 'archivada');

  const whereClause = and(visibilityCondition, archivedCondition);

  const rows = await db
    .select({
      id: crmBrands.id,
      name: crmBrands.name,
      manager: crmBrands.manager,
      website: crmBrands.website,
      sector: crmBrands.sector,
      tipo: crmBrands.tipo,
      geo: crmBrands.geo,
      country: crmBrands.country,
      status: crmBrands.status,
      ownerUserId: crmBrands.ownerUserId,
      portalUserId: crmBrands.portalUserId,
      createdByUserId:    crmBrands.createdByUserId,
      assignedToUserId:   crmBrands.assignedToUserId,
      coAssignedToUserId: crmBrands.coAssignedToUserId,
      geoTargets: crmBrands.geoTargets,
      lookingFor: crmBrands.lookingFor,
      dealTypes: crmBrands.dealTypes,
      taxId: crmBrands.taxId,
      address: crmBrands.address,
      discord: crmBrands.discord,
      telegram: crmBrands.telegram,
      whatsapp: crmBrands.whatsapp,
      lastContactAt: crmBrands.lastContactAt,
      nextFollowupAt: crmBrands.nextFollowupAt,
      nextFollowUpAt: crmBrands.nextFollowUpAt,
      notes: crmBrands.notes,
      createdAt: crmBrands.createdAt,
      updatedAt: crmBrands.updatedAt,
      // Rate cards & workspace defaults
      defaultRateCard: crmBrands.defaultRateCard,
      agencyFeePct: crmBrands.agencyFeePct,
      paymentTermsDays: crmBrands.paymentTermsDays,
      billingEmail: crmBrands.billingEmail,
      nif: crmBrands.nif,
      fiscalName: crmBrands.fiscalName,
      contactCount: sql<number>`(SELECT COUNT(*)::int FROM ${crmBrandContacts} WHERE ${crmBrandContacts.brandId} = ${crmBrands.id})`,
      ownerName: user.name,
    })
    .from(crmBrands)
    .leftJoin(user, eq(user.id, crmBrands.ownerUserId))
    .where(whereClause)
    .orderBy(desc(crmBrands.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const primaryByBrand = new Map<number, CrmBrandContact>();
  const primaries = await db
    .select()
    .from(crmBrandContacts)
    .where(eq(crmBrandContacts.isPrimary, true));
  for (const c of primaries) {
    if (ids.includes(c.brandId)) primaryByBrand.set(c.brandId, c);
  }

  return rows.map((r) => ({
    ...r,
    primaryContact: primaryByBrand.get(r.id) ?? null,
    followupStatus: computeFollowupStatus(r.nextFollowupAt),
  }));
}

/**
 * Carga una marca del CRM por id con todos sus contactos (primarios primero).
 *
 * @cache none
 * @visibility admin
 * @returns marca con `contacts[]` o `null` si no existe.
 */
export async function getCrmBrand(id: number): Promise<CrmBrandWithContacts | null> {
  const [brand] = await db.select().from(crmBrands).where(eq(crmBrands.id, id)).limit(1);
  if (!brand) return null;

  const contacts = await db
    .select()
    .from(crmBrandContacts)
    .where(eq(crmBrandContacts.brandId, id))
    .orderBy(desc(crmBrandContacts.isPrimary), asc(crmBrandContacts.name));

  return { ...brand, contacts };
}

/**
 * Lista los contactos de una marca del CRM. Primarios primero, luego por nombre ASC.
 *
 * @cache none
 * @visibility admin
 * @returns array readonly (puede ser vacío). Nunca null.
 */
export async function getBrandContacts(brandId: number): Promise<readonly CrmBrandContact[]> {
  return db
    .select()
    .from(crmBrandContacts)
    .where(eq(crmBrandContacts.brandId, brandId))
    .orderBy(desc(crmBrandContacts.isPrimary), asc(crmBrandContacts.name));
}

/**
 * Versión batch: contactos para varias marcas en una sola query, agrupados por `brandId`.
 * Cada grupo conserva el orden (primarios primero, luego nombre ASC).
 *
 * @cache none
 * @visibility admin
 * @returns Map vacío si `brandIds` está vacío. Marcas sin contactos no aparecen en el Map.
 */
export async function getContactsByBrandIds(
  brandIds: readonly number[],
): Promise<Map<number, readonly CrmBrandContact[]>> {
  const out = new Map<number, CrmBrandContact[]>();
  if (brandIds.length === 0) return out;
  const rows = await db
    .select()
    .from(crmBrandContacts)
    .where(inArray(crmBrandContacts.brandId, [...brandIds]))
    .orderBy(desc(crmBrandContacts.isPrimary), asc(crmBrandContacts.name));
  for (const c of rows) {
    const list = out.get(c.brandId);
    if (list) list.push(c);
    else out.set(c.brandId, [c]);
  }
  return out;
}

/**
 * Inserta una marca nueva en el CRM.
 *
 * @cache none
 * @visibility admin
 * @returns la fila insertada. Lanza si la inserción falla.
 */
export async function createCrmBrand(values: NewCrmBrand): Promise<CrmBrand> {
  const [row] = await db.insert(crmBrands).values(values).returning();
  if (!row) throw new Error('Failed to insert crm brand');
  return row;
}

/**
 * Actualiza parcialmente una marca del CRM y refresca `updatedAt`.
 *
 * @cache none
 * @visibility admin
 * @returns la fila actualizada o `null` si no existe.
 */
export async function updateCrmBrand(
  id: number,
  patch: Partial<NewCrmBrand>,
): Promise<CrmBrand | null> {
  const [row] = await db
    .update(crmBrands)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(crmBrands.id, id))
    .returning();
  return row ?? null;
}

/**
 * Borra una marca del CRM por id (cascade vía FK en contactos/follow-ups).
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function deleteCrmBrand(id: number): Promise<void> {
  await db.delete(crmBrands).where(eq(crmBrands.id, id));
}

/**
 * Crea un contacto de marca en el CRM. Si `isPrimary=true`, demueve los demás contactos
 * primarios de la misma marca antes de insertar.
 *
 * @cache none
 * @visibility admin
 * @returns la fila insertada. Lanza si la inserción falla.
 */
export async function createBrandContact(values: NewCrmBrandContact): Promise<CrmBrandContact> {
  if (values.isPrimary) {
    await db
      .update(crmBrandContacts)
      .set({ isPrimary: false })
      .where(eq(crmBrandContacts.brandId, values.brandId));
  }
  const [row] = await db.insert(crmBrandContacts).values(values).returning();
  if (!row) throw new Error('Failed to insert brand contact');
  return row;
}

/**
 * Actualiza un contacto de marca. Si `patch.isPrimary=true`, demueve a los demás contactos
 * primarios de la misma marca antes de actualizar.
 *
 * @cache none
 * @visibility admin
 * @returns la fila actualizada o `null` si no existe.
 */
export async function updateBrandContact(
  id: number,
  patch: Partial<NewCrmBrandContact>,
): Promise<CrmBrandContact | null> {
  if (patch.isPrimary) {
    const [contact] = await db
      .select({ brandId: crmBrandContacts.brandId })
      .from(crmBrandContacts)
      .where(eq(crmBrandContacts.id, id));
    if (contact) {
      await db
        .update(crmBrandContacts)
        .set({ isPrimary: false })
        .where(and(eq(crmBrandContacts.brandId, contact.brandId)));
    }
  }
  const [row] = await db
    .update(crmBrandContacts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(crmBrandContacts.id, id))
    .returning();
  return row ?? null;
}

/**
 * Borra un contacto de marca por id.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function deleteBrandContact(id: number): Promise<void> {
  await db.delete(crmBrandContacts).where(eq(crmBrandContacts.id, id));
}

/**
 * Devuelve el `ownerUserId` de una marca del CRM. Útil para checks de permiso.
 *
 * @cache none
 * @visibility admin
 * @returns userId del owner o `null` (si la marca no existe o no tiene owner).
 */
export async function getCrmBrandOwner(brandId: number): Promise<string | null> {
  const [row] = await db
    .select({ ownerUserId: crmBrands.ownerUserId })
    .from(crmBrands)
    .where(eq(crmBrands.id, brandId))
    .limit(1);
  return row?.ownerUserId ?? null;
}

// ── Follow-ups ────────────────────────────────────────────────────────────────

/**
 * Lista todos los follow-ups (pendientes y completados) de una marca, ordenados por `scheduledAt` ASC.
 *
 * @cache none
 * @visibility admin
 * @returns array readonly (puede ser vacío). Nunca null.
 */
export async function listBrandFollowups(brandId: number): Promise<readonly CrmBrandFollowup[]> {
  return db
    .select()
    .from(crmBrandFollowups)
    .where(eq(crmBrandFollowups.brandId, brandId))
    .orderBy(asc(crmBrandFollowups.scheduledAt));
}

/**
 * Versión batch: follow-ups para varias marcas en una sola query, agrupados por `brandId`.
 * Cada grupo conserva el orden por `scheduledAt` ASC.
 *
 * @cache none
 * @visibility admin
 * @returns Map vacío si `brandIds` está vacío. Marcas sin follow-ups no aparecen en el Map.
 */
export async function getFollowupsByBrandIds(
  brandIds: readonly number[],
): Promise<Map<number, readonly CrmBrandFollowup[]>> {
  const out = new Map<number, CrmBrandFollowup[]>();
  if (brandIds.length === 0) return out;
  const rows = await db
    .select()
    .from(crmBrandFollowups)
    .where(inArray(crmBrandFollowups.brandId, [...brandIds]))
    .orderBy(asc(crmBrandFollowups.scheduledAt));
  for (const f of rows) {
    const list = out.get(f.brandId);
    if (list) list.push(f);
    else out.set(f.brandId, [f]);
  }
  return out;
}

/**
 * Lista follow-ups pendientes (no completados) en una ventana de N días (default 30) con info de marca.
 * Aplica filtro de visibilidad si el rol lo requiere (staff: solo asignados a sí mismo).
 *
 * @cache none
 * @visibility admin
 * @scope staff
 * @returns array readonly con `brandName` (puede ser vacío). Nunca null.
 */
export async function listUpcomingFollowups(opts?: {
  userId?: string;
  role?: Role;
  days?: number;
}): Promise<readonly CrmBrandFollowupWithBrand[]> {
  const { userId, role, days = 30 } = opts ?? {};
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const visibilityCondition =
    userId && role && needsVisibilityFilter(role)
      ? eq(crmBrandFollowups.assignedToUserId, userId)
      : undefined;

  const rows = await db
    .select({
      id: crmBrandFollowups.id,
      brandId: crmBrandFollowups.brandId,
      brandName: crmBrands.name,
      createdByUserId: crmBrandFollowups.createdByUserId,
      scheduledAt: crmBrandFollowups.scheduledAt,
      note: crmBrandFollowups.note,
      priority: crmBrandFollowups.priority,
      completedAt: crmBrandFollowups.completedAt,
      channel: crmBrandFollowups.channel,
      summary: crmBrandFollowups.summary,
      nextAction: crmBrandFollowups.nextAction,
      nextActionAt: crmBrandFollowups.nextActionAt,
      status: crmBrandFollowups.status,
      assignedToUserId: crmBrandFollowups.assignedToUserId,
      responsibleUserId: crmBrandFollowups.responsibleUserId,
      createdAt: crmBrandFollowups.createdAt,
      updatedAt: crmBrandFollowups.updatedAt,
    })
    .from(crmBrandFollowups)
    .innerJoin(crmBrands, eq(crmBrands.id, crmBrandFollowups.brandId))
    .where(
      and(
        isNull(crmBrandFollowups.completedAt),
        or(lte(crmBrandFollowups.scheduledAt, cutoff), lte(crmBrandFollowups.scheduledAt, new Date())),
        visibilityCondition,
      ),
    )
    .orderBy(asc(crmBrandFollowups.scheduledAt));
  return rows;
}

/**
 * Crea un follow-up para una marca del CRM.
 *
 * @cache none
 * @visibility admin
 * @returns la fila insertada. Lanza si la inserción falla.
 */
export async function createBrandFollowup(values: NewCrmBrandFollowup): Promise<CrmBrandFollowup> {
  const [row] = await db.insert(crmBrandFollowups).values(values).returning();
  if (!row) throw new Error('Failed to insert followup');
  return row;
}

/**
 * Actualiza parcialmente un follow-up de marca y refresca `updatedAt`.
 *
 * @cache none
 * @visibility admin
 * @returns la fila actualizada o `null` si no existe.
 */
export async function updateBrandFollowup(
  id: number,
  patch: Partial<NewCrmBrandFollowup>,
): Promise<CrmBrandFollowup | null> {
  const [row] = await db
    .update(crmBrandFollowups)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(crmBrandFollowups.id, id))
    .returning();
  return row ?? null;
}

/**
 * Marca un follow-up como completado fijando `completedAt = now`.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function completeBrandFollowup(id: number): Promise<void> {
  await db
    .update(crmBrandFollowups)
    .set({ completedAt: new Date() })
    .where(eq(crmBrandFollowups.id, id));
}

/**
 * Borra un follow-up de marca por id.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function deleteBrandFollowup(id: number): Promise<void> {
  await db.delete(crmBrandFollowups).where(eq(crmBrandFollowups.id, id));
}

// ── Admin helpers ─────────────────────────────────────────────────────────────

/**
 * Devuelve solo los IDs de propietario/asignado de una marca para checks de permiso (`canAccess*`).
 *
 * @cache none
 * @visibility admin
 * @scope staff
 * @returns `{ assignedToUserId, createdByUserId }` o `undefined` si la marca no existe.
 */
export async function getCrmBrandForPermission(
  brandId: number,
): Promise<{ assignedToUserId: string | null; coAssignedToUserId: string | null; createdByUserId: string | null } | undefined> {
  const [row] = await db
    .select({
      assignedToUserId:   crmBrands.assignedToUserId,
      coAssignedToUserId: crmBrands.coAssignedToUserId,
      createdByUserId:    crmBrands.createdByUserId,
    })
    .from(crmBrands)
    .where(eq(crmBrands.id, brandId))
    .limit(1);
  return row ?? undefined;
}
