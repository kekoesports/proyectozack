import { db } from '@/lib/db';
import {
  dealDeliverableTrackers,
  dealDeliverableItems,
} from '@/db/schema/dealDeliverableTrackers';
import { alerts } from '@/db/schema/alerts';
import { campaigns } from '@/db/schema/campaigns';
import { talents } from '@/db/schema/talents';
import { eq, desc, count, inArray, and, sql } from 'drizzle-orm';
import type { CreateTrackerInput, ParsedLinkRow, DeliverableSubtype } from '@/lib/schemas/deal-tracker';
import { normalizeContentUrl } from '@/lib/utils/url-normalizer';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrackerSummary = typeof dealDeliverableTrackers.$inferSelect & {
  campaignName: string | null;
  talentName: string | null;
};

export type TrackerWithItems = typeof dealDeliverableTrackers.$inferSelect & {
  campaignName: string | null;
  talentName: string | null;
  items: (typeof dealDeliverableItems.$inferSelect)[];
};

export type ImportResult = {
  inserted: number;
  duplicatesSkipped: number;
  invalidSkipped: number;
  total: number;
};

// ── Create ────────────────────────────────────────────────────────────────────

export async function createTracker(input: CreateTrackerInput, createdByUserId: string) {
  const rows = await db
    .insert(dealDeliverableTrackers)
    .values({
      brandName:       input.brandName,
      dealName:        input.dealName,
      deliverableType: input.deliverableType,
      targetCount:     input.targetCount,
      campaignId:      input.campaignId ?? null,
      talentId:        input.talentId ?? null,
      notes:           input.notes ?? null,
    })
    .returning();
  void createdByUserId;
  const tracker = rows[0];
  if (!tracker) throw new Error('No se pudo crear el tracker');
  return tracker;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listTrackers(opts?: { status?: string; limit?: number; offset?: number }) {
  const rows = await db
    .select({
      tracker: dealDeliverableTrackers,
      campaignName: campaigns.name,
      talentName: talents.name,
    })
    .from(dealDeliverableTrackers)
    .leftJoin(campaigns, eq(dealDeliverableTrackers.campaignId, campaigns.id))
    .leftJoin(talents, eq(dealDeliverableTrackers.talentId, talents.id))
    .orderBy(desc(dealDeliverableTrackers.createdAt))
    .limit(opts?.limit ?? 100)
    .offset(opts?.offset ?? 0);

  return rows.map((r: typeof rows[number]) => ({
    ...r.tracker,
    campaignName: r.campaignName ?? null,
    talentName: r.talentName ?? null,
  }));
}

export async function getTrackerWithItems(trackerId: number): Promise<TrackerWithItems | null> {
  const rows = await db
    .select({
      tracker: dealDeliverableTrackers,
      campaignName: campaigns.name,
      talentName: talents.name,
    })
    .from(dealDeliverableTrackers)
    .leftJoin(campaigns, eq(dealDeliverableTrackers.campaignId, campaigns.id))
    .leftJoin(talents, eq(dealDeliverableTrackers.talentId, talents.id))
    .where(eq(dealDeliverableTrackers.id, trackerId))
    .limit(1);

  if (!rows[0]) return null;

  const items = await db
    .select()
    .from(dealDeliverableItems)
    .where(eq(dealDeliverableItems.trackerId, trackerId))
    .orderBy(desc(dealDeliverableItems.createdAt));

  return {
    ...rows[0].tracker,
    campaignName: rows[0].campaignName ?? null,
    talentName: rows[0].talentName ?? null,
    items,
  };
}

// ── Import links ──────────────────────────────────────────────────────────────

export type ClassifiedImportRow = {
  originalUrl: string;
  normalizedUrl: string;
  platform: 'twitch' | 'kick' | 'youtube' | 'instagram' | 'tiktok' | 'other';
  sourceRowIndex: number | null;
  contentDate: string | undefined;
  notes: string | undefined;
  status: 'valid' | 'duplicate';
  deliverableSubtype: DeliverableSubtype | undefined;
};

export type ClassifyResult = {
  classified: ClassifiedImportRow[];
  inserted: number;
  duplicatesSkipped: number;
  invalidSkipped: number;
};

/**
 * Pure classification step — no DB access.
 * Exported for unit testing; used by importTrackerItems.
 */
export function classifyImportRows(
  existingNormalizedUrls: Set<string>,
  rows: ParsedLinkRow[],
): ClassifyResult {
  const seen = new Set(existingNormalizedUrls);
  const classified: ClassifiedImportRow[] = [];
  let inserted = 0;
  let duplicatesSkipped = 0;
  let invalidSkipped = 0;

  for (const row of rows) {
    const normalized = normalizeContentUrl(row.originalUrl);

    if (!normalized.isValid) {
      invalidSkipped++;
      continue;
    }

    if (seen.has(normalized.normalizedUrl)) {
      duplicatesSkipped++;
      classified.push({
        originalUrl: row.originalUrl,
        normalizedUrl: normalized.normalizedUrl,
        platform: normalized.platform,
        sourceRowIndex: row.sourceRowIndex ?? null,
        contentDate: row.contentDate,
        notes: row.notes,
        status: 'duplicate',
        deliverableSubtype: row.deliverableSubtype,
      });
    } else {
      seen.add(normalized.normalizedUrl);
      classified.push({
        originalUrl: row.originalUrl,
        normalizedUrl: normalized.normalizedUrl,
        platform: normalized.platform,
        sourceRowIndex: row.sourceRowIndex ?? null,
        contentDate: row.contentDate,
        notes: row.notes,
        status: 'valid',
        deliverableSubtype: row.deliverableSubtype,
      });
      inserted++;
    }
  }

  return { classified, inserted, duplicatesSkipped, invalidSkipped };
}

export async function importTrackerItems(
  trackerId: number,
  rows: ParsedLinkRow[],
  sourceFileName: string,
): Promise<ImportResult> {
  const existing = await db
    .select({ normalizedUrl: dealDeliverableItems.normalizedUrl })
    .from(dealDeliverableItems)
    .where(eq(dealDeliverableItems.trackerId, trackerId));

  const existingUrls = new Set(existing.map((e: { normalizedUrl: string }) => e.normalizedUrl));

  const { classified, inserted, duplicatesSkipped, invalidSkipped } = classifyImportRows(existingUrls, rows);

  const toInsert: (typeof dealDeliverableItems.$inferInsert)[] = classified.map((r) => ({
    trackerId,
    sourceRowIndex: r.sourceRowIndex,
    originalUrl: r.originalUrl,
    normalizedUrl: r.normalizedUrl,
    platform: r.platform,
    deliverableSubtype: r.deliverableSubtype ?? null,
    contentDate: r.contentDate ?? null,
    notes: r.notes ?? null,
    status: r.status,
  }));

  if (toInsert.length > 0) {
    await db.insert(dealDeliverableItems).values(toInsert);
  }

  await db
    .update(dealDeliverableTrackers)
    .set({ sourceFileName, lastImportedAt: new Date(), updatedAt: new Date() })
    .where(eq(dealDeliverableTrackers.id, trackerId));

  await recalculateAndMaybeComplete(trackerId);

  return { inserted, duplicatesSkipped, invalidSkipped, total: rows.length };
}

// ── Recalculate currentCount ──────────────────────────────────────────────────

async function recalculateAndMaybeComplete(trackerId: number) {
  const [countRow] = await db
    .select({ cnt: count() })
    .from(dealDeliverableItems)
    .where(
      and(
        eq(dealDeliverableItems.trackerId, trackerId),
        inArray(dealDeliverableItems.status, ['valid', 'approved']),
      ),
    );

  const currentCount = Number(countRow?.cnt ?? 0);

  const [tracker] = await db
    .select()
    .from(dealDeliverableTrackers)
    .where(eq(dealDeliverableTrackers.id, trackerId))
    .limit(1);

  if (!tracker) return;

  const updates: Partial<typeof dealDeliverableTrackers.$inferInsert> = {
    currentCount,
    updatedAt: new Date(),
  };

  if (tracker.status === 'active' && currentCount >= tracker.targetCount) {
    updates.status = 'review_pending';
    updates.completedAt = new Date();

    // Guard: only insert if no active alert exists for this tracker
    await db.execute(
      sql`
        INSERT INTO crm_alerts (type, title, description, severity, status, related_entity_type, related_entity_id)
        SELECT 'deal_tracker_complete',
               ${`${tracker.dealName} — ${tracker.brandName}: ${currentCount}/${tracker.targetCount} completados`},
               ${'El tracker ha alcanzado su objetivo. Requiere revisión manual.'},
               'high', 'active', 'deal_tracker', ${trackerId}
        WHERE NOT EXISTS (
          SELECT 1 FROM crm_alerts
          WHERE type = 'deal_tracker_complete'
            AND related_entity_type = 'deal_tracker'
            AND related_entity_id = ${trackerId}
            AND status = 'active'
        )
      `,
    );
  }

  await db
    .update(dealDeliverableTrackers)
    .set(updates)
    .where(eq(dealDeliverableTrackers.id, trackerId));
}

// ── Update target count ───────────────────────────────────────────────────────

export async function updateTrackerTarget(trackerId: number, targetCount: number) {
  await db
    .update(dealDeliverableTrackers)
    .set({ targetCount, updatedAt: new Date() })
    .where(eq(dealDeliverableTrackers.id, trackerId));
  await recalculateAndMaybeComplete(trackerId);
}

// ── Update parse mode ─────────────────────────────────────────────────────────

export async function updateTrackerParseMode(
  trackerId: number,
  trackingParseMode: 'simple_columns' | 'socialpro_blocks' | 'horizontal_triplets',
) {
  await db
    .update(dealDeliverableTrackers)
    .set({ trackingParseMode, updatedAt: new Date() })
    .where(eq(dealDeliverableTrackers.id, trackerId));
}

// ── Delete tracker ────────────────────────────────────────────────────────────

export async function deleteTracker(trackerId: number) {
  await db
    .delete(dealDeliverableTrackers)
    .where(eq(dealDeliverableTrackers.id, trackerId));
}

// ── Delete tracker item ───────────────────────────────────────────────────────

export async function deleteTrackerItem(itemId: number, trackerId: number) {
  await db
    .delete(dealDeliverableItems)
    .where(eq(dealDeliverableItems.id, itemId));
  await recalculateAndMaybeComplete(trackerId);
}

// ── Review item ───────────────────────────────────────────────────────────────

export async function reviewTrackerItem(
  itemId: number,
  newStatus: 'valid' | 'invalid' | 'approved' | 'rejected',
  reviewerUserId: string,
) {
  const [item] = await db
    .update(dealDeliverableItems)
    .set({ status: newStatus, reviewedAt: new Date(), reviewedByUserId: reviewerUserId })
    .where(eq(dealDeliverableItems.id, itemId))
    .returning({ trackerId: dealDeliverableItems.trackerId });

  if (item) {
    await recalculateAndMaybeComplete(item.trackerId);
  }
}

// ── Approve tracker ───────────────────────────────────────────────────────────

export async function approveTracker(trackerId: number, reviewerUserId: string) {
  await db
    .update(dealDeliverableTrackers)
    .set({ status: 'approved', reviewedAt: new Date(), reviewedByUserId: reviewerUserId, updatedAt: new Date() })
    .where(
      and(
        eq(dealDeliverableTrackers.id, trackerId),
        inArray(dealDeliverableTrackers.status, ['review_pending', 'active']),
      ),
    );

  // Resolve any open alert for this tracker
  await db
    .update(alerts)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(
      and(
        eq(alerts.type, 'deal_tracker_complete'),
        eq(alerts.relatedEntityType, 'deal_tracker'),
        eq(alerts.relatedEntityId, trackerId),
        eq(alerts.status, 'active'),
      ),
    );
}
