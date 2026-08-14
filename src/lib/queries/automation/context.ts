'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
} from 'drizzle-orm';
import {
  alerts,
  campaigns,
  communicationDrafts,
  contracts,
  crmActivities,
  crmBrandContacts,
  crmBrandFollowups,
  crmBrands,
  crmTasks,
  deliverables,
  invoices,
  talents,
} from '@/db/schema';
import { db, getTransactionalDb } from '@/lib/db';
import { enqueueAutomationEvent } from '@/lib/automation/outbox';
import type { CampaignAutomationPatch } from '@/lib/schemas/integrationApi';

export type LookupEntityType = 'brand' | 'campaign' | 'talent' | 'contact';

export async function lookupAutomationEntity(entityType: LookupEntityType, id: number) {
  if (entityType === 'brand') {
    const [row] = await db.select().from(crmBrands).where(eq(crmBrands.id, id)).limit(1);
    return row ?? null;
  }
  if (entityType === 'campaign') {
    const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return row ?? null;
  }
  if (entityType === 'talent') {
    const [row] = await db.select({
      id: talents.id,
      name: talents.name,
      slug: talents.slug,
      role: talents.role,
      game: talents.game,
      platform: talents.platform,
      status: talents.status,
    }).from(talents).where(eq(talents.id, id)).limit(1);
    return row ?? null;
  }
  const [row] = await db.select().from(crmBrandContacts).where(eq(crmBrandContacts.id, id)).limit(1);
  return row ?? null;
}

export async function searchAutomationContext(q: string, limit: number, offset: number) {
  const pattern = `%${q}%`;
  const eachLimit = Math.max(1, Math.ceil(limit / 4));
  const [brandRows, contactRows, talentRows, campaignRows] = await Promise.all([
    db.select({ id: crmBrands.id, name: crmBrands.name, status: crmBrands.status, type: crmBrands.tipo })
      .from(crmBrands)
      .where(or(ilike(crmBrands.name, pattern), ilike(crmBrands.manager, pattern), ilike(crmBrands.website, pattern)))
      .orderBy(asc(crmBrands.name)).limit(eachLimit).offset(offset),
    db.select({ id: crmBrandContacts.id, brandId: crmBrandContacts.brandId, name: crmBrandContacts.name, email: crmBrandContacts.email })
      .from(crmBrandContacts)
      .where(or(ilike(crmBrandContacts.name, pattern), ilike(crmBrandContacts.email, pattern)))
      .orderBy(asc(crmBrandContacts.name)).limit(eachLimit).offset(offset),
    db.select({ id: talents.id, name: talents.name, slug: talents.slug, status: talents.status })
      .from(talents)
      .where(or(ilike(talents.name, pattern), ilike(talents.slug, pattern)))
      .orderBy(asc(talents.name)).limit(eachLimit).offset(offset),
    db.select({ id: campaigns.id, name: campaigns.name, status: campaigns.status, brandId: campaigns.brandId, talentId: campaigns.talentId })
      .from(campaigns)
      .where(ilike(campaigns.name, pattern))
      .orderBy(desc(campaigns.createdAt)).limit(eachLimit).offset(offset),
  ]);
  return {
    brands: brandRows,
    contacts: contactRows,
    talents: talentRows,
    campaigns: campaignRows,
  };
}

export async function getAutomationCampaignContext(id: number) {
  const [campaign] = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      actionType: campaigns.actionType,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      deliveryDeadline: campaigns.deliveryDeadline,
      currency: campaigns.currency,
      amountBrand: campaigns.amountBrand,
      amountTalent: campaigns.amountTalent,
      responsibleUserId: campaigns.responsibleUserId,
      trackingSheetUrl: campaigns.trackingSheetUrl,
      brandId: campaigns.brandId,
      brandName: crmBrands.name,
      talentId: campaigns.talentId,
      talentName: talents.name,
      contactId: campaigns.brandContactId,
      contactName: crmBrandContacts.name,
      contactEmail: crmBrandContacts.email,
    })
    .from(campaigns)
    .innerJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
    .innerJoin(talents, eq(talents.id, campaigns.talentId))
    .leftJoin(crmBrandContacts, eq(crmBrandContacts.id, campaigns.brandContactId))
    .where(eq(campaigns.id, id))
    .limit(1);
  if (!campaign) return null;

  const [deliverableRows, contractRows, invoiceRows, taskRows, activityRows] = await Promise.all([
    db.select().from(deliverables).where(eq(deliverables.campaignId, id)).orderBy(asc(deliverables.dueDate)),
    db.select({ id: contracts.id, status: contracts.status, sentAt: contracts.sentAt, signedAt: contracts.signedAt })
      .from(contracts).where(eq(contracts.campaignId, id)).orderBy(desc(contracts.createdAt)),
    db.select({ id: invoices.id, kind: invoices.kind, status: invoices.status, dueDate: invoices.dueDate, totalAmount: invoices.totalAmount, currency: invoices.currency })
      .from(invoices).where(eq(invoices.campaignId, id)).orderBy(desc(invoices.issueDate)),
    db.select().from(crmTasks)
      .where(and(eq(crmTasks.relatedType, 'campaign'), eq(crmTasks.relatedId, id)))
      .orderBy(asc(crmTasks.dueDate)),
    db.select().from(crmActivities).where(eq(crmActivities.campaignId, id))
      .orderBy(desc(crmActivities.occurredAt)).limit(50),
  ]);
  return { campaign, deliverables: deliverableRows, contracts: contractRows, invoices: invoiceRows, tasks: taskRows, activities: activityRows };
}

export async function patchAutomationCampaignAssets(
  id: number,
  input: CampaignAutomationPatch,
) {
  const transactionalDb = getTransactionalDb();
  return transactionalDb.transaction(async (tx) => {
    const [row] = await tx
      .update(campaigns)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    if (!row) return null;
    await enqueueAutomationEvent(tx, {
      eventType: 'campaign.automation_assets_updated',
      aggregateType: 'campaign',
      aggregateId: id,
      idempotencyKey: `campaign.automation_assets_updated:${id}:${row.updatedAt.toISOString()}`,
      payload: {
        campaignId: id,
        briefingUrl: row.briefingUrl,
        contentUrl: row.contentUrl,
        trackingSheetUrl: row.trackingSheetUrl,
        trackingSheetSpreadsheetId: row.trackingSheetSpreadsheetId,
      },
    });
    return row;
  });
}

type DeliverableFilters = {
  campaignId?: number | undefined;
  status?: typeof deliverables.$inferSelect.status | undefined;
  dueBefore?: string | undefined;
  limit: number;
  offset: number;
};

export async function listAutomationDeliverables(filters: DeliverableFilters) {
  const conditions = [];
  if (filters.campaignId) conditions.push(eq(deliverables.campaignId, filters.campaignId));
  if (filters.status) conditions.push(eq(deliverables.status, filters.status));
  if (filters.dueBefore) conditions.push(lt(deliverables.dueDate, new Date(filters.dueBefore)));
  return db
    .select({
      id: deliverables.id,
      campaignId: deliverables.campaignId,
      campaignName: campaigns.name,
      talentId: deliverables.talentId,
      title: deliverables.title,
      type: deliverables.type,
      status: deliverables.status,
      dueDate: deliverables.dueDate,
      contentUrl: deliverables.contentUrl,
      updatedAt: deliverables.updatedAt,
    })
    .from(deliverables)
    .innerJoin(campaigns, eq(campaigns.id, deliverables.campaignId))
    .where(and(...conditions))
    .orderBy(asc(deliverables.dueDate), desc(deliverables.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);
}

export async function listAutomationRisks(severity: 'low' | 'medium' | 'high' | 'critical' | undefined, limit: number, offset: number) {
  const conditions = [eq(alerts.status, 'active')];
  if (severity) conditions.push(eq(alerts.severity, severity));
  return db
    .select()
    .from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.triggeredAt))
    .limit(limit)
    .offset(offset);
}

export async function getAutomationExecutiveSummary() {
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const [campaignCount, deliverableCount, followupCount, taskCount, riskCount, draftCount] = await Promise.all([
    db.select({ value: count() }).from(campaigns).where(inArray(campaigns.status, ['aprobada', 'activa', 'pendiente_pago'])),
    db.select({ value: count() }).from(deliverables).where(and(
      lt(deliverables.dueDate, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
      inArray(deliverables.status, ['pending_submission', 'submitted', 'internal_review', 'brand_review', 'revision_requested']),
    )),
    db.select({ value: count() }).from(crmBrandFollowups).where(and(
      eq(crmBrandFollowups.status, 'pendiente'),
      isNull(crmBrandFollowups.completedAt),
    )),
    db.select({ value: count() }).from(crmTasks).where(and(
      inArray(crmTasks.status, ['pendiente', 'en_progreso']),
      lt(crmTasks.dueDate, today),
    )),
    db.select({ value: count() }).from(alerts).where(eq(alerts.status, 'active')),
    db.select({ value: count() }).from(communicationDrafts).where(eq(communicationDrafts.status, 'pending_approval')),
  ]);
  return {
    generatedAt: now.toISOString(),
    activeCampaigns: campaignCount[0]?.value ?? 0,
    deliverablesDueWithin7Days: deliverableCount[0]?.value ?? 0,
    pendingFollowups: followupCount[0]?.value ?? 0,
    overdueTasks: taskCount[0]?.value ?? 0,
    activeRisks: riskCount[0]?.value ?? 0,
    draftsAwaitingApproval: draftCount[0]?.value ?? 0,
  };
}
