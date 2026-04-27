import { and, asc, desc, eq, isNull, lte, ne, or, sql } from 'drizzle-orm';

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
      legalName: crmBrands.legalName,
      website: crmBrands.website,
      sector: crmBrands.sector,
      tipo: crmBrands.tipo,
      geo: crmBrands.geo,
      country: crmBrands.country,
      status: crmBrands.status,
      ownerUserId: crmBrands.ownerUserId,
      portalUserId: crmBrands.portalUserId,
      createdByUserId: crmBrands.createdByUserId,
      assignedToUserId: crmBrands.assignedToUserId,
      lastContactAt: crmBrands.lastContactAt,
      nextFollowupAt: crmBrands.nextFollowupAt,
      notes: crmBrands.notes,
      createdAt: crmBrands.createdAt,
      updatedAt: crmBrands.updatedAt,
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

export async function getBrandContacts(brandId: number): Promise<readonly CrmBrandContact[]> {
  return db
    .select()
    .from(crmBrandContacts)
    .where(eq(crmBrandContacts.brandId, brandId))
    .orderBy(desc(crmBrandContacts.isPrimary), asc(crmBrandContacts.name));
}

export async function createCrmBrand(values: NewCrmBrand): Promise<CrmBrand> {
  const [row] = await db.insert(crmBrands).values(values).returning();
  if (!row) throw new Error('Failed to insert crm brand');
  return row;
}

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

export async function deleteCrmBrand(id: number): Promise<void> {
  await db.delete(crmBrands).where(eq(crmBrands.id, id));
}

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

export async function deleteBrandContact(id: number): Promise<void> {
  await db.delete(crmBrandContacts).where(eq(crmBrandContacts.id, id));
}

export async function getCrmBrandOwner(brandId: number): Promise<string | null> {
  const [row] = await db
    .select({ ownerUserId: crmBrands.ownerUserId })
    .from(crmBrands)
    .where(eq(crmBrands.id, brandId))
    .limit(1);
  return row?.ownerUserId ?? null;
}

// ── Follow-ups ────────────────────────────────────────────────────────────────

export async function listBrandFollowups(brandId: number): Promise<readonly CrmBrandFollowup[]> {
  return db
    .select()
    .from(crmBrandFollowups)
    .where(eq(crmBrandFollowups.brandId, brandId))
    .orderBy(asc(crmBrandFollowups.scheduledAt));
}

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

export async function createBrandFollowup(values: NewCrmBrandFollowup): Promise<CrmBrandFollowup> {
  const [row] = await db.insert(crmBrandFollowups).values(values).returning();
  if (!row) throw new Error('Failed to insert followup');
  return row;
}

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

export async function completeBrandFollowup(id: number): Promise<void> {
  await db
    .update(crmBrandFollowups)
    .set({ completedAt: new Date() })
    .where(eq(crmBrandFollowups.id, id));
}

export async function deleteBrandFollowup(id: number): Promise<void> {
  await db.delete(crmBrandFollowups).where(eq(crmBrandFollowups.id, id));
}

// ── Admin helpers ─────────────────────────────────────────────────────────────

export async function getCrmBrandForPermission(
  brandId: number,
): Promise<{ assignedToUserId: string | null; createdByUserId: string | null } | undefined> {
  const [row] = await db
    .select({
      assignedToUserId: crmBrands.assignedToUserId,
      createdByUserId: crmBrands.createdByUserId,
    })
    .from(crmBrands)
    .where(eq(crmBrands.id, brandId))
    .limit(1);
  return row ?? undefined;
}
