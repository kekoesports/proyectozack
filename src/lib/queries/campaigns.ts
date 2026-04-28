import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { campaigns, crmBrands, talents, user } from '@/db/schema';
import type { Campaign, CampaignWithRelations } from '@/types';

const SELECT_COLS = {
  id: campaigns.id,
  brandId: campaigns.brandId,
  talentId: campaigns.talentId,
  name: campaigns.name,
  sector: campaigns.sector,
  geo: campaigns.geo,
  actionType: campaigns.actionType,
  status: campaigns.status,
  startDate: campaigns.startDate,
  endDate: campaigns.endDate,
  deliveryDeadline: campaigns.deliveryDeadline,
  description: campaigns.description,
  deliverables: campaigns.deliverables,
  briefingUrl: campaigns.briefingUrl,
  contentUrl: campaigns.contentUrl,
  notes: campaigns.notes,
  amountBrand: campaigns.amountBrand,
  amountTalent: campaigns.amountTalent,
  agencyFee: campaigns.agencyFee,
  agencyFeePercent: campaigns.agencyFeePercent,
  brandPaid: campaigns.brandPaid,
  brandPaidDate: campaigns.brandPaidDate,
  brandPaidAmount: campaigns.brandPaidAmount,
  brandPaymentMethod: campaigns.brandPaymentMethod,
  talentPaid: campaigns.talentPaid,
  talentPaidDate: campaigns.talentPaidDate,
  talentPaidAmount: campaigns.talentPaidAmount,
  talentPaymentMethod: campaigns.talentPaymentMethod,
  responsibleUserId: campaigns.responsibleUserId,
  createdByUserId: campaigns.createdByUserId,
  visibility: campaigns.visibility,
  archivedAt: campaigns.archivedAt,
  createdAt: campaigns.createdAt,
  updatedAt: campaigns.updatedAt,
  brandName: crmBrands.name,
  talentName: talents.name,
  ownerName: user.name,
};

function buildRow(r: typeof SELECT_COLS extends Record<string, infer V> ? Record<string, unknown> : never): CampaignWithRelations {
  return r as unknown as CampaignWithRelations;
}

// ── Listado ───────────────────────────────────────────────────────────

export async function listCampaigns(filters?: {
  brandId?: number;
  talentId?: number;
  status?: string;
  responsibleUserId?: string;
}): Promise<CampaignWithRelations[]> {
  const rows = await db
    .select(SELECT_COLS)
    .from(campaigns)
    .leftJoin(crmBrands, eq(campaigns.brandId, crmBrands.id))
    .leftJoin(talents, eq(campaigns.talentId, talents.id))
    .leftJoin(user, eq(campaigns.responsibleUserId, user.id))
    .where(
      and(
        filters?.brandId !== undefined ? eq(campaigns.brandId, filters.brandId) : undefined,
        filters?.talentId !== undefined ? eq(campaigns.talentId, filters.talentId) : undefined,
        filters?.status !== undefined ? eq(campaigns.status, filters.status as Campaign['status']) : undefined,
        filters?.responsibleUserId !== undefined ? eq(campaigns.responsibleUserId, filters.responsibleUserId) : undefined,
      ),
    )
    .orderBy(desc(campaigns.createdAt));

  return rows.map((r) => ({
    ...r,
    brandName: r.brandName ?? null,
    talentName: r.talentName ?? null,
    ownerName: r.ownerName ?? null,
  }));
}

export async function getCampaign(id: number): Promise<CampaignWithRelations | null> {
  const rows = await db
    .select(SELECT_COLS)
    .from(campaigns)
    .leftJoin(crmBrands, eq(campaigns.brandId, crmBrands.id))
    .leftJoin(talents, eq(campaigns.talentId, talents.id))
    .leftJoin(user, eq(campaigns.responsibleUserId, user.id))
    .where(eq(campaigns.id, id))
    .limit(1);

  if (!rows[0]) return null;
  return { ...rows[0], brandName: rows[0].brandName ?? null, talentName: rows[0].talentName ?? null, ownerName: rows[0].ownerName ?? null };
}

// ── Estadísticas por marca ─────────────────────────────────────────────

export type BrandCampaignSummary = {
  total: number;
  active: number;
  totalRevenue: number;
  pendingRevenue: number;
};

export async function getBrandCampaignSummary(brandId: number): Promise<BrandCampaignSummary> {
  const rows = await db
    .select({ status: campaigns.status, amountBrand: campaigns.amountBrand, brandPaid: campaigns.brandPaid })
    .from(campaigns)
    .where(eq(campaigns.brandId, brandId));

  return {
    total: rows.length,
    active: rows.filter((r) => r.status === 'activa').length,
    totalRevenue: rows.reduce((s, r) => s + Number(r.amountBrand ?? 0), 0),
    pendingRevenue: rows.filter((r) => !r.brandPaid).reduce((s, r) => s + Number(r.amountBrand ?? 0), 0),
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────

export async function createCampaign(data: {
  brandId?: number | null;
  talentId?: number | null;
  name: string;
  sector?: string | null;
  geo?: string | null;
  status?: Campaign['status'];
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  deliverables?: string | null;
  notes?: string | null;
  amountBrand?: string | null;
  amountTalent?: string | null;
  agencyFee?: string | null;
  agencyFeePercent?: string | null;
  responsibleUserId?: string | null;
}): Promise<Campaign> {
  const [row] = await db.insert(campaigns).values(data).returning();
  return row!;
}

export async function updateCampaign(
  id: number,
  data: Partial<typeof campaigns.$inferInsert>,
): Promise<void> {
  await db.update(campaigns).set({ ...data, updatedAt: new Date() }).where(eq(campaigns.id, id));
}

export async function markCampaignBrandPaid(id: number, amount: string, method: string): Promise<void> {
  await db.update(campaigns).set({
    brandPaid: true,
    brandPaidDate: new Date().toISOString().split('T')[0],
    brandPaidAmount: amount,
    brandPaymentMethod: method,
    updatedAt: new Date(),
  }).where(eq(campaigns.id, id));
}

export async function markCampaignTalentPaid(id: number, amount: string, method: string): Promise<void> {
  await db.update(campaigns).set({
    talentPaid: true,
    talentPaidDate: new Date().toISOString().split('T')[0],
    talentPaidAmount: amount,
    talentPaymentMethod: method,
    updatedAt: new Date(),
  }).where(eq(campaigns.id, id));
}

export async function deleteCampaign(id: number): Promise<void> {
  await db.delete(campaigns).where(eq(campaigns.id, id));
}
