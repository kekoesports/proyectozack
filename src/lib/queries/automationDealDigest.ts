import 'server-only';

import { and, eq, inArray, isNull, ne } from 'drizzle-orm';

import { campaigns } from '@/db/schema/campaigns';
import { crmBrands } from '@/db/schema/crmBrands';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { talents } from '@/db/schema/talents';
import { db } from '@/lib/db';

const ACTIVE_DEAL_STATUSES = [
  'propuesta',
  'negociacion',
  'aprobada',
  'activa',
  'pendiente_pago',
] as const;

const STALE_AFTER_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DealDigestAction =
  | 'sync_error'
  | 'missing_sheet'
  | 'missing_targets'
  | 'completed'
  | 'prepare_invoice'
  | 'stale'
  | 'on_track';

export type AutomationDealDigestRow = {
  readonly campaignId: number;
  readonly name: string;
  readonly brandName: string;
  readonly talentName: string;
  readonly status: string;
  readonly currency: string;
  readonly amountBrand: string;
  readonly amountTalent: string;
  readonly amountInKindTalent: string | null;
  readonly amountInKindCommunity: string | null;
  readonly crmPath: string;
  readonly trackingSheetUrl: string | null;
  readonly syncError: string | null;
  readonly lastSyncedAt: string | null;
  readonly lastEvidenceAddedAt: string | null;
  readonly targetCount: number;
  readonly currentCount: number;
  readonly progressPct: number;
  readonly inactiveDays: number;
  readonly nextAction: DealDigestAction;
};

export type AutomationDealDigest = {
  readonly generatedAt: string;
  readonly staleAfterDays: number;
  readonly summary: {
    readonly total: number;
    readonly syncErrors: number;
    readonly missingSheets: number;
    readonly missingTargets: number;
    readonly completed: number;
    readonly excludedOldCompleted: number;
    readonly prepareInvoice: number;
    readonly stale: number;
  };
  readonly deals: readonly AutomationDealDigestRow[];
};

export async function getAutomationDealDigest(now = new Date()): Promise<AutomationDealDigest> {
  const rows = await db
    .select({
      campaignId: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      currency: campaigns.currency,
      amountBrand: campaigns.amountBrand,
      amountTalent: campaigns.amountTalent,
      amountInKindTalent: campaigns.amountInKindTalent,
      amountInKindCommunity: campaigns.amountInKindCommunity,
      brandName: crmBrands.name,
      talentName: talents.name,
      trackingSheetUrl: campaigns.trackingSheetUrl,
      syncError: campaigns.trackingSyncError,
      lastSyncedAt: campaigns.lastTrackingSyncAt,
      lastEvidenceAddedAt: campaigns.lastEvidenceAddedAt,
      createdAt: campaigns.createdAt,
      trackerStatus: dealDeliverableTrackers.status,
      targetCount: dealDeliverableTrackers.targetCount,
      currentCount: dealDeliverableTrackers.currentCount,
    })
    .from(campaigns)
    .innerJoin(crmBrands, eq(campaigns.brandId, crmBrands.id))
    .innerJoin(talents, eq(campaigns.talentId, talents.id))
    .leftJoin(dealDeliverableTrackers, and(
      eq(dealDeliverableTrackers.campaignId, campaigns.id),
      ne(dealDeliverableTrackers.status, 'cancelled'),
    ))
    .where(and(
      inArray(campaigns.status, [...ACTIVE_DEAL_STATUSES]),
      isNull(campaigns.archivedAt),
    ));

  const grouped = new Map<number, {
    base: Omit<AutomationDealDigestRow, 'targetCount' | 'currentCount' | 'progressPct' | 'inactiveDays' | 'nextAction'>;
    targetCount: number;
    currentCount: number;
    inactivityBaseline: Date;
  }>();

  for (const row of rows) {
    const current = grouped.get(row.campaignId) ?? {
      base: {
        campaignId: row.campaignId,
        name: row.name,
        brandName: row.brandName,
        talentName: row.talentName,
        status: row.status,
        currency: row.currency,
        amountBrand: row.amountBrand,
        amountTalent: row.amountTalent,
        amountInKindTalent: row.amountInKindTalent,
        amountInKindCommunity: row.amountInKindCommunity,
        crmPath: `/admin/campanas/${row.campaignId}`,
        trackingSheetUrl: row.trackingSheetUrl,
        syncError: row.syncError,
        lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
        lastEvidenceAddedAt: row.lastEvidenceAddedAt?.toISOString() ?? null,
      },
      targetCount: 0,
      currentCount: 0,
      inactivityBaseline: row.lastEvidenceAddedAt ?? row.createdAt,
    };
    if (row.trackerStatus) {
      current.targetCount += row.targetCount ?? 0;
      current.currentCount += row.currentCount ?? 0;
    }
    grouped.set(row.campaignId, current);
  }

  const allDeals = Array.from(grouped.values()).map((row): AutomationDealDigestRow => {
    const progressPct = row.targetCount > 0
      ? Math.min(100, Math.round((row.currentCount / row.targetCount) * 100))
      : 0;
    const inactiveDays = Math.max(0, Math.floor((now.getTime() - row.inactivityBaseline.getTime()) / DAY_MS));
    const nextAction = classifyNextAction({
      trackingSheetUrl: row.base.trackingSheetUrl,
      syncError: row.base.syncError,
      targetCount: row.targetCount,
      progressPct,
      inactiveDays,
    });
    return {
      ...row.base,
      targetCount: row.targetCount,
      currentCount: row.currentCount,
      progressPct,
      inactiveDays,
      nextAction,
    };
  }).sort((left, right) => actionPriority(left.nextAction) - actionPriority(right.nextAction));

  // Los tratos terminados hace tiempo permanecen a veces en estados activos
  // mientras se cierra la parte administrativa. No aportan nada al parte
  // diario y tapaban los asuntos que sí requieren atención.
  const deals = allDeals.filter(shouldIncludeInDigest);
  const excludedOldCompleted = allDeals.length - deals.length;

  return {
    generatedAt: now.toISOString(),
    staleAfterDays: STALE_AFTER_DAYS,
    summary: {
      total: deals.length,
      syncErrors: deals.filter((deal) => deal.nextAction === 'sync_error').length,
      missingSheets: deals.filter((deal) => deal.nextAction === 'missing_sheet').length,
      missingTargets: deals.filter((deal) => deal.nextAction === 'missing_targets').length,
      completed: deals.filter((deal) => deal.nextAction === 'completed').length,
      excludedOldCompleted,
      prepareInvoice: deals.filter((deal) => deal.nextAction === 'prepare_invoice').length,
      stale: deals.filter((deal) => deal.nextAction === 'stale').length,
    },
    deals,
  };
}

export function shouldIncludeInDigest(deal: Pick<AutomationDealDigestRow, 'progressPct' | 'inactiveDays'>): boolean {
  return !(deal.progressPct >= 100 && deal.inactiveDays >= STALE_AFTER_DAYS);
}

export function classifyNextAction(input: {
  readonly trackingSheetUrl: string | null;
  readonly syncError: string | null;
  readonly targetCount: number;
  readonly progressPct: number;
  readonly inactiveDays: number;
}): DealDigestAction {
  if (!input.trackingSheetUrl) return 'missing_sheet';
  if (input.syncError) return 'sync_error';
  if (input.targetCount <= 0) return 'missing_targets';
  if (input.progressPct >= 100) return 'completed';
  if (input.progressPct >= 70) return 'prepare_invoice';
  if (input.inactiveDays >= STALE_AFTER_DAYS) return 'stale';
  return 'on_track';
}

function actionPriority(action: DealDigestAction): number {
  const priorities: Record<DealDigestAction, number> = {
    sync_error: 0,
    missing_sheet: 1,
    missing_targets: 2,
    completed: 3,
    prepare_invoice: 4,
    stale: 5,
    on_track: 6,
  };
  return priorities[action];
}
