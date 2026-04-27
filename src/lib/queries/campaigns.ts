import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { campaigns, crmBrands, crmBrandContacts, invoices, talents, user } from '@/db/schema';
import { needsVisibilityFilter } from '@/lib/permissions';
import { computeCampaignDerived } from '@/lib/schemas/campaign';

import type { Role } from '@/lib/auth-guard';
import type {
  CampaignActionType,
  CampaignDerived,
  CampaignPaymentDerivedStatus,
  CampaignPaymentMethod,
  CampaignStatus,
} from '@/lib/schemas/campaign';
import type { CampaignRow } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CampaignFilters = {
  status?: CampaignStatus | CampaignStatus[];
  brandId?: number;
  talentId?: number;
  responsibleUserId?: string;
  sector?: string;
  geo?: string;
  includeArchived?: boolean;
};

export type CampaignWithRelations = CampaignRow &
  CampaignDerived & {
    brand: { id: number; name: string; sector: string | null; geo: string | null };
    talent: { id: number; name: string; slug: string; photoUrl: string | null };
    brandContact: { id: number; name: string; email: string | null } | null;
    responsibleUser: { id: string; name: string } | null;
    brandPaid: CampaignPaymentDerivedStatus;
    talentPaid: CampaignPaymentDerivedStatus;
    totalInvoicedBrand: number;
    totalPaidTalent: number;
  };

export type CampaignBrandSummary = {
  campaigns: CampaignRow[];
  totalAmountBrand: number;
  totalCommission: number;
  count: number;
};

export type CampaignTalentSummary = {
  campaigns: CampaignRow[];
  totalAmountTalent: number;
  totalGeneratedForTalent: number;
  count: number;
};

export type CampaignPaymentStatus = {
  brandPaid: CampaignPaymentDerivedStatus;
  talentPaid: CampaignPaymentDerivedStatus;
  totalInvoicedBrand: number;
  totalPaidTalent: number;
};

export type CreateCampaignInput = {
  name: string;
  brandId: number;
  talentId: number;
  brandContactId?: number;
  responsibleUserId?: string;
  createdByUserId?: string;
  assignedToUserId?: string;
  sector?: string;
  geo?: string;
  actionType: CampaignActionType;
  status?: CampaignStatus;
  startDate?: string;
  endDate?: string;
  deliveryDeadline?: string;
  briefingUrl?: string;
  contentUrl?: string;
  notes?: string;
  amountBrand?: number;
  amountTalent?: number;
  brandPaymentMethod?: CampaignPaymentMethod;
  talentPaymentMethod?: CampaignPaymentMethod;
  visibility?: 'team' | 'private';
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function derivedPaymentStatus(
  sum: number,
  amount: number,
): CampaignPaymentDerivedStatus {
  if (sum <= 0) return 'no';
  if (sum >= amount) return 'si';
  return 'parcial';
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listCampaigns(opts?: {
  filters?: CampaignFilters;
  session?: { userId: string; role: Role };
}): Promise<CampaignRow[]> {
  const { filters, session } = opts ?? {};
  const { includeArchived = false, ...rest } = filters ?? {};

  const conditions: (ReturnType<typeof eq> | ReturnType<typeof or> | ReturnType<typeof isNull>)[] = [];

  // Archived filter — default: exclude archived
  if (!includeArchived) {
    conditions.push(isNull(campaigns.archivedAt));
  }

  // Visibility filter for staff
  if (session && needsVisibilityFilter(session.role)) {
    const visibilityCondition = or(
      eq(campaigns.assignedToUserId, session.userId),
      eq(campaigns.createdByUserId, session.userId),
    );
    if (visibilityCondition) conditions.push(visibilityCondition);
  }

  // Status filter
  if (rest.status !== undefined) {
    if (Array.isArray(rest.status)) {
      if (rest.status.length > 0) {
        conditions.push(inArray(campaigns.status, rest.status));
      }
    } else {
      conditions.push(eq(campaigns.status, rest.status));
    }
  }

  // brandId filter
  if (rest.brandId !== undefined) {
    conditions.push(eq(campaigns.brandId, rest.brandId));
  }

  // talentId filter
  if (rest.talentId !== undefined) {
    conditions.push(eq(campaigns.talentId, rest.talentId));
  }

  // responsibleUserId filter
  if (rest.responsibleUserId !== undefined) {
    conditions.push(eq(campaigns.responsibleUserId, rest.responsibleUserId));
  }

  // sector filter
  if (rest.sector !== undefined) {
    conditions.push(eq(campaigns.sector, rest.sector));
  }

  // geo filter
  if (rest.geo !== undefined) {
    conditions.push(eq(campaigns.geo, rest.geo));
  }

  const rows = await db
    .select()
    .from(campaigns)
    .where(and(...conditions))
    .orderBy(desc(campaigns.createdAt));

  return rows.map((row) => ({ ...row }));
}

export async function getCampaignWithRelations(
  id: number,
): Promise<CampaignWithRelations | undefined> {
  const responsibleUserAlias = user;

  const rows = await db
    .select({
      // Campaign fields
      id: campaigns.id,
      name: campaigns.name,
      brandId: campaigns.brandId,
      talentId: campaigns.talentId,
      brandContactId: campaigns.brandContactId,
      responsibleUserId: campaigns.responsibleUserId,
      createdByUserId: campaigns.createdByUserId,
      assignedToUserId: campaigns.assignedToUserId,
      sector: campaigns.sector,
      geo: campaigns.geo,
      actionType: campaigns.actionType,
      status: campaigns.status,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      deliveryDeadline: campaigns.deliveryDeadline,
      briefingUrl: campaigns.briefingUrl,
      contentUrl: campaigns.contentUrl,
      notes: campaigns.notes,
      amountBrand: campaigns.amountBrand,
      amountTalent: campaigns.amountTalent,
      brandPaymentMethod: campaigns.brandPaymentMethod,
      talentPaymentMethod: campaigns.talentPaymentMethod,
      visibility: campaigns.visibility,
      archivedAt: campaigns.archivedAt,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
      // Brand fields
      brandName: crmBrands.name,
      brandSector: crmBrands.sector,
      brandGeo: crmBrands.geo,
      // Talent fields
      talentName: talents.name,
      talentSlug: talents.slug,
      talentPhotoUrl: talents.photoUrl,
      // Brand contact fields
      brandContactName: crmBrandContacts.name,
      brandContactEmail: crmBrandContacts.email,
      // Responsible user fields
      responsibleUserName: responsibleUserAlias.name,
    })
    .from(campaigns)
    .innerJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
    .innerJoin(talents, eq(talents.id, campaigns.talentId))
    .leftJoin(crmBrandContacts, eq(crmBrandContacts.id, campaigns.brandContactId))
    .leftJoin(responsibleUserAlias, eq(responsibleUserAlias.id, campaigns.responsibleUserId))
    .where(eq(campaigns.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  const paymentStatus = await getCampaignPaymentStatus(
    id,
    Number(row.amountBrand),
    Number(row.amountTalent),
  );

  const derived = computeCampaignDerived({
    amountBrand: row.amountBrand,
    amountTalent: row.amountTalent,
  });

  return {
    id: row.id,
    name: row.name,
    brandId: row.brandId,
    talentId: row.talentId,
    brandContactId: row.brandContactId,
    responsibleUserId: row.responsibleUserId,
    createdByUserId: row.createdByUserId,
    assignedToUserId: row.assignedToUserId,
    sector: row.sector,
    geo: row.geo,
    actionType: row.actionType,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    deliveryDeadline: row.deliveryDeadline,
    briefingUrl: row.briefingUrl,
    contentUrl: row.contentUrl,
    notes: row.notes,
    amountBrand: row.amountBrand,
    amountTalent: row.amountTalent,
    brandPaymentMethod: row.brandPaymentMethod,
    talentPaymentMethod: row.talentPaymentMethod,
    visibility: row.visibility,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...derived,
    brand: {
      id: row.brandId,
      name: row.brandName,
      sector: row.brandSector ?? null,
      geo: row.brandGeo ?? null,
    },
    talent: {
      id: row.talentId,
      name: row.talentName,
      slug: row.talentSlug,
      photoUrl: row.talentPhotoUrl ?? null,
    },
    brandContact:
      row.brandContactId !== null && row.brandContactName !== null
        ? {
            id: row.brandContactId,
            name: row.brandContactName,
            email: row.brandContactEmail ?? null,
          }
        : null,
    responsibleUser:
      row.responsibleUserId !== null && row.responsibleUserName !== null
        ? { id: row.responsibleUserId, name: row.responsibleUserName }
        : null,
    ...paymentStatus,
  };
}

export async function listCampaignsByBrand(
  brandId: number,
): Promise<CampaignBrandSummary> {
  const rows = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.brandId, brandId), isNull(campaigns.archivedAt)))
    .orderBy(desc(campaigns.createdAt));

  const aggregates = await db
    .select({
      totalAmountBrand: sql<string>`COALESCE(SUM(${campaigns.amountBrand}), 0)`,
      totalAmountTalent: sql<string>`COALESCE(SUM(${campaigns.amountTalent}), 0)`,
    })
    .from(campaigns)
    .where(and(eq(campaigns.brandId, brandId), isNull(campaigns.archivedAt)));

  const agg = aggregates[0];
  const totalAmountBrand = Number(agg?.totalAmountBrand ?? 0);
  const totalAmountTalent = Number(agg?.totalAmountTalent ?? 0);

  return {
    campaigns: rows,
    totalAmountBrand,
    totalCommission: totalAmountBrand - totalAmountTalent,
    count: rows.length,
  };
}

export async function listCampaignsByTalent(
  talentId: number,
): Promise<CampaignTalentSummary> {
  const rows = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.talentId, talentId), isNull(campaigns.archivedAt)))
    .orderBy(desc(campaigns.createdAt));

  const aggregates = await db
    .select({
      totalAmountTalent: sql<string>`COALESCE(SUM(${campaigns.amountTalent}), 0)`,
      totalAmountBrand: sql<string>`COALESCE(SUM(${campaigns.amountBrand}), 0)`,
    })
    .from(campaigns)
    .where(and(eq(campaigns.talentId, talentId), isNull(campaigns.archivedAt)));

  const agg = aggregates[0];
  const totalAmountTalent = Number(agg?.totalAmountTalent ?? 0);
  const totalAmountBrand = Number(agg?.totalAmountBrand ?? 0);

  return {
    campaigns: rows,
    totalAmountTalent,
    totalGeneratedForTalent: totalAmountBrand,
    count: rows.length,
  };
}

export async function createCampaign(input: CreateCampaignInput): Promise<CampaignRow> {
  const [row] = await db
    .insert(campaigns)
    .values({
      name: input.name,
      brandId: input.brandId,
      talentId: input.talentId,
      brandContactId: input.brandContactId ?? null,
      responsibleUserId: input.responsibleUserId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      assignedToUserId: input.assignedToUserId ?? null,
      sector: input.sector ?? null,
      geo: input.geo ?? null,
      actionType: input.actionType,
      status: input.status ?? 'propuesta',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      deliveryDeadline: input.deliveryDeadline ?? null,
      briefingUrl: input.briefingUrl ?? null,
      contentUrl: input.contentUrl ?? null,
      notes: input.notes ?? null,
      amountBrand: String(input.amountBrand ?? 0),
      amountTalent: String(input.amountTalent ?? 0),
      brandPaymentMethod: input.brandPaymentMethod ?? null,
      talentPaymentMethod: input.talentPaymentMethod ?? null,
      visibility: input.visibility ?? 'team',
    })
    .returning();

  if (!row) throw new Error('Failed to insert campaign');
  return row;
}

export async function updateCampaign(
  id: number,
  patch: Partial<CreateCampaignInput>,
): Promise<CampaignRow | undefined> {
  const setValue: Record<string, unknown> = { updatedAt: new Date() };

  if (patch.name !== undefined) setValue['name'] = patch.name;
  if (patch.brandId !== undefined) setValue['brandId'] = patch.brandId;
  if (patch.talentId !== undefined) setValue['talentId'] = patch.talentId;
  if ('brandContactId' in patch) setValue['brandContactId'] = patch.brandContactId ?? null;
  if ('responsibleUserId' in patch) setValue['responsibleUserId'] = patch.responsibleUserId ?? null;
  if ('createdByUserId' in patch) setValue['createdByUserId'] = patch.createdByUserId ?? null;
  if ('assignedToUserId' in patch) setValue['assignedToUserId'] = patch.assignedToUserId ?? null;
  if ('sector' in patch) setValue['sector'] = patch.sector ?? null;
  if ('geo' in patch) setValue['geo'] = patch.geo ?? null;
  if (patch.actionType !== undefined) setValue['actionType'] = patch.actionType;
  if (patch.status !== undefined) setValue['status'] = patch.status;
  if ('startDate' in patch) setValue['startDate'] = patch.startDate ?? null;
  if ('endDate' in patch) setValue['endDate'] = patch.endDate ?? null;
  if ('deliveryDeadline' in patch) setValue['deliveryDeadline'] = patch.deliveryDeadline ?? null;
  if ('briefingUrl' in patch) setValue['briefingUrl'] = patch.briefingUrl ?? null;
  if ('contentUrl' in patch) setValue['contentUrl'] = patch.contentUrl ?? null;
  if ('notes' in patch) setValue['notes'] = patch.notes ?? null;
  if (patch.amountBrand !== undefined) setValue['amountBrand'] = String(patch.amountBrand);
  if (patch.amountTalent !== undefined) setValue['amountTalent'] = String(patch.amountTalent);
  if ('brandPaymentMethod' in patch) setValue['brandPaymentMethod'] = patch.brandPaymentMethod ?? null;
  if ('talentPaymentMethod' in patch) setValue['talentPaymentMethod'] = patch.talentPaymentMethod ?? null;
  if (patch.visibility !== undefined) setValue['visibility'] = patch.visibility;

  const [row] = await db
    .update(campaigns)
    .set(setValue)
    .where(eq(campaigns.id, id))
    .returning();

  return row ?? undefined;
}
export async function archiveCampaign(id: number): Promise<CampaignRow | undefined> {
  const [row] = await db
    .update(campaigns)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();

  return row ?? undefined;
}
export async function unarchiveCampaign(id: number): Promise<CampaignRow | undefined> {
  const [row] = await db
    .update(campaigns)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();

  return row ?? undefined;
}
export async function getCampaignPaymentStatus(
  campaignId: number,
  amountBrand: number,
  amountTalent: number,
): Promise<CampaignPaymentStatus> {
  const [incomeRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.campaignId, campaignId),
        eq(invoices.kind, 'income'),
        eq(invoices.status, 'cobrada'),
      ),
    );

  const [expenseRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.campaignId, campaignId),
        eq(invoices.kind, 'expense'),
        eq(invoices.status, 'cobrada'),
      ),
    );

  const totalInvoicedBrand = Number(incomeRow?.total ?? 0);
  const totalPaidTalent = Number(expenseRow?.total ?? 0);

  return {
    brandPaid: derivedPaymentStatus(totalInvoicedBrand, amountBrand),
    talentPaid: derivedPaymentStatus(totalPaidTalent, amountTalent),
    totalInvoicedBrand,
    totalPaidTalent,
  };
}

export async function assertCanEditCampaign(
  campaignId: number,
  session: { userId: string; role: Role },
): Promise<void> {
  if (session.role === 'admin' || session.role === 'manager') return;

  const [row] = await db
    .select({
      assignedToUserId: campaigns.assignedToUserId,
      createdByUserId: campaigns.createdByUserId,
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!row) throw new Error('forbidden:edit:campaign');

  const isOwner =
    row.assignedToUserId === session.userId ||
    row.createdByUserId === session.userId;

  if (!isOwner) throw new Error('forbidden:edit:campaign');
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function listAllCampaigns(opts?: {
  includeArchived?: boolean;
}): Promise<CampaignRow[]> {
  const { includeArchived = false } = opts ?? {};

  const whereClause = includeArchived ? undefined : isNull(campaigns.archivedAt);

  const rows = await db
    .select()
    .from(campaigns)
    .where(whereClause)
    .orderBy(desc(campaigns.createdAt));

  return rows;
}

export async function getCampaignById(id: number): Promise<CampaignRow | undefined> {
  const [row] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);

  return row ?? undefined;
}
export async function getCampaignForPermission(
  campaignId: number,
): Promise<{ assignedToUserId: string | null; createdByUserId: string | null } | undefined> {
  const [row] = await db
    .select({
      assignedToUserId: campaigns.assignedToUserId,
      createdByUserId: campaigns.createdByUserId,
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  return row ?? undefined;
}

