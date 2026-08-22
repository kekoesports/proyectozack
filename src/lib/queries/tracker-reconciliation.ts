import { and, count, desc, eq, inArray, isNull, or } from 'drizzle-orm';

import { campaigns } from '@/db/schema/campaigns';
import { crmBrands } from '@/db/schema/crmBrands';
import {
  dealDeliverableItems,
  dealDeliverableTrackers,
} from '@/db/schema/dealDeliverableTrackers';
import { talents } from '@/db/schema/talents';
import type { Role } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { needsVisibilityFilter } from '@/lib/permissions';
import {
  isAmbiguousMatch,
  isLinkableCampaignStatus,
  matchCampaignsToTracker,
  selectDisplayedCandidates,
  type CampaignMatchCandidate,
  type CampaignMatchInput,
} from '@/lib/tracker-reconciliation-match';
import type { TrackerReconciliationQueueFilter } from '@/lib/schemas/tracker-reconciliation';

export type ReconciliationSession = {
  readonly userId: string;
  readonly role: Role;
};

export type ReconciliationQueueRow = {
  readonly trackerId: number;
  readonly dealName: string;
  readonly brandName: string;
  readonly talentId: number | null;
  readonly talentName: string | null;
  readonly targetCount: number;
  readonly currentCount: number;
  readonly trackingSourceType: string;
  readonly trackingSourceUrl: string | null;
  readonly itemCount: number;
  readonly reconciliationStatus: 'unreconciled' | 'legacy' | 'deferred';
  readonly reconciliationNote: string | null;
  readonly candidates: readonly CampaignMatchCandidate[];
  readonly ambiguous: boolean;
};

const LINKABLE_STATUSES = [
  'propuesta',
  'negociacion',
  'aprobada',
  'activa',
  'pendiente_pago',
] as const;

function campaignVisibility(session: ReconciliationSession | undefined) {
  if (!session || !needsVisibilityFilter(session.role)) return undefined;
  return or(
    eq(campaigns.assignedToUserId, session.userId),
    eq(campaigns.createdByUserId, session.userId),
    eq(campaigns.responsibleUserId, session.userId),
  );
}

export async function listLinkableCampaigns(
  session?: ReconciliationSession,
): Promise<CampaignMatchInput[]> {
  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      talentId: campaigns.talentId,
      brandName: crmBrands.name,
      talentName: talents.name,
    })
    .from(campaigns)
    .innerJoin(crmBrands, eq(campaigns.brandId, crmBrands.id))
    .innerJoin(talents, eq(campaigns.talentId, talents.id))
    .where(
      and(
        isNull(campaigns.archivedAt),
        inArray(campaigns.status, [...LINKABLE_STATUSES]),
        campaignVisibility(session),
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    talentId: row.talentId,
    brandName: row.brandName,
    talentName: row.talentName,
  }));
}

export async function listReconciliationQueue(opts: {
  readonly filter: TrackerReconciliationQueueFilter;
  readonly session?: ReconciliationSession;
}): Promise<readonly ReconciliationQueueRow[]> {
  const trackers = await db
    .select({
      tracker: dealDeliverableTrackers,
      talentName: talents.name,
    })
    .from(dealDeliverableTrackers)
    .leftJoin(talents, eq(dealDeliverableTrackers.talentId, talents.id))
    .where(
      and(
        isNull(dealDeliverableTrackers.campaignId),
        eq(dealDeliverableTrackers.reconciliationStatus, opts.filter),
      ),
    )
    .orderBy(desc(dealDeliverableTrackers.createdAt))
    .limit(200);

  const ids = trackers.map((row) => row.tracker.id);
  const countRows = ids.length === 0
    ? []
    : await db
        .select({
          trackerId: dealDeliverableItems.trackerId,
          n: count(),
        })
        .from(dealDeliverableItems)
        .where(inArray(dealDeliverableItems.trackerId, ids))
        .groupBy(dealDeliverableItems.trackerId);

  const countByTracker = new Map(countRows.map((row) => [row.trackerId, Number(row.n)]));
  const campaignsForMatch = await listLinkableCampaigns(opts.session);

  return trackers.map((row) => {
    const candidates = selectDisplayedCandidates(
      matchCampaignsToTracker(
        { talentId: row.tracker.talentId, brandName: row.tracker.brandName },
        campaignsForMatch,
      ),
    );
    return {
      trackerId: row.tracker.id,
      dealName: row.tracker.dealName,
      brandName: row.tracker.brandName,
      talentId: row.tracker.talentId,
      talentName: row.talentName ?? null,
      targetCount: row.tracker.targetCount,
      currentCount: row.tracker.currentCount,
      trackingSourceType: row.tracker.trackingSourceType,
      trackingSourceUrl: row.tracker.trackingSourceUrl,
      itemCount: countByTracker.get(row.tracker.id) ?? 0,
      reconciliationStatus: row.tracker.reconciliationStatus,
      reconciliationNote: row.tracker.reconciliationNote,
      candidates,
      ambiguous: isAmbiguousMatch(candidates),
    };
  });
}

export async function linkTrackerToCampaign(input: {
  readonly trackerId: number;
  readonly campaignId: number;
  readonly note?: string;
  readonly session: ReconciliationSession;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const [tracker] = await db
    .select({
      id: dealDeliverableTrackers.id,
      campaignId: dealDeliverableTrackers.campaignId,
    })
    .from(dealDeliverableTrackers)
    .where(eq(dealDeliverableTrackers.id, input.trackerId))
    .limit(1);

  if (!tracker) return { ok: false, error: 'Tracker no encontrado' };
  if (tracker.campaignId != null) return { ok: false, error: 'El tracker ya está enlazado' };

  const [campaign] = await db
    .select({
      id: campaigns.id,
      status: campaigns.status,
      assignedToUserId: campaigns.assignedToUserId,
      createdByUserId: campaigns.createdByUserId,
      responsibleUserId: campaigns.responsibleUserId,
      archivedAt: campaigns.archivedAt,
    })
    .from(campaigns)
    .where(eq(campaigns.id, input.campaignId))
    .limit(1);

  if (!campaign) return { ok: false, error: 'Campaña no encontrada' };
  if (campaign.archivedAt) return { ok: false, error: 'La campaña está archivada' };
  if (!isLinkableCampaignStatus(campaign.status)) {
    return { ok: false, error: 'Esa campaña no admite enlace' };
  }

  if (needsVisibilityFilter(input.session.role)) {
    const visible =
      campaign.assignedToUserId === input.session.userId
      || campaign.createdByUserId === input.session.userId
      || campaign.responsibleUserId === input.session.userId;
    if (!visible) return { ok: false, error: 'Campaña no visible' };
  }

  const now = new Date();
  const updated = await db
    .update(dealDeliverableTrackers)
    .set({
      campaignId: input.campaignId,
      reconciliationNote: input.note ?? null,
      reconciledAt: now,
      reconciledByUserId: input.session.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(dealDeliverableTrackers.id, input.trackerId),
        isNull(dealDeliverableTrackers.campaignId),
      ),
    )
    .returning({ id: dealDeliverableTrackers.id });

  if (updated.length === 0) return { ok: false, error: 'El tracker ya está enlazado' };
  return { ok: true };
}

export async function classifyUnlinkedTracker(input: {
  readonly trackerId: number;
  readonly status: 'legacy' | 'deferred';
  readonly note?: string;
  readonly session: ReconciliationSession;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const [tracker] = await db
    .select({
      id: dealDeliverableTrackers.id,
      campaignId: dealDeliverableTrackers.campaignId,
    })
    .from(dealDeliverableTrackers)
    .where(eq(dealDeliverableTrackers.id, input.trackerId))
    .limit(1);

  if (!tracker) return { ok: false, error: 'Tracker no encontrado' };
  if (tracker.campaignId != null) return { ok: false, error: 'El tracker ya está enlazado' };

  const now = new Date();
  const updated = await db
    .update(dealDeliverableTrackers)
    .set({
      reconciliationStatus: input.status,
      reconciliationNote: input.note ?? null,
      reconciledAt: now,
      reconciledByUserId: input.session.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(dealDeliverableTrackers.id, input.trackerId),
        isNull(dealDeliverableTrackers.campaignId),
      ),
    )
    .returning({ id: dealDeliverableTrackers.id });

  if (updated.length === 0) return { ok: false, error: 'El tracker ya está enlazado' };
  return { ok: true };
}
