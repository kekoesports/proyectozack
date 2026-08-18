import 'server-only';

import { eq, inArray } from 'drizzle-orm';

import { campaigns } from '@/db/schema/campaigns';
import {
  dealDeliverableItems,
  dealDeliverableTrackers,
} from '@/db/schema/dealDeliverableTrackers';
import { getTransactionalDb } from '@/lib/db';
import type { SheetEvidence } from '@/lib/queries/campaign-sheet-aggregation';
import { normalizeContentUrl } from '@/lib/utils/url-normalizer';

type TrackerRow = {
  readonly id: number;
  readonly deliverableType: string;
  readonly currentCount: number;
};

type ApplySheetEvidenceInput = {
  readonly campaignId: number;
  readonly trackers: readonly TrackerRow[];
  readonly evidenceByType: ReadonlyMap<string, readonly SheetEvidence[]>;
  readonly resetMissingTypes: boolean;
  readonly syncedAt: Date;
};

export type ApplySheetEvidenceResult = {
  readonly updated: number;
  readonly usedTypes: ReadonlySet<string>;
  readonly newEvidence: number;
};

/**
 * Persiste el snapshot actual de evidencias de Google Sheets en el CRM.
 *
 * - `detectedAt` conserva la primera aparición.
 * - `lastSeenAt` registra la última sincronización donde el enlace existía.
 * - ausencias posteriores desactivan la evidencia sin borrar el histórico;
 * - una revisión humana `invalid/rejected` prevalece sobre el parser.
 */
export async function applyCampaignSheetEvidence(
  input: ApplySheetEvidenceInput,
): Promise<ApplySheetEvidenceResult> {
  return getTransactionalDb().transaction(async (tx) => {
    const trackerByType = new Map<string, TrackerRow>();
    for (const tracker of input.trackers) {
      if (!trackerByType.has(tracker.deliverableType)) {
        trackerByType.set(tracker.deliverableType, tracker);
      }
    }

    const trackerIds = input.trackers.map((tracker) => tracker.id);
    const existing = trackerIds.length > 0
      ? await tx
          .select({
            id: dealDeliverableItems.id,
            trackerId: dealDeliverableItems.trackerId,
            normalizedUrl: dealDeliverableItems.normalizedUrl,
            status: dealDeliverableItems.status,
            sourceType: dealDeliverableItems.sourceType,
            isActive: dealDeliverableItems.isActive,
          })
          .from(dealDeliverableItems)
          .where(inArray(dealDeliverableItems.trackerId, trackerIds))
      : [];

    const existingByKey = new Map<string, (typeof existing)[number]>(
      existing.map((item) => [`${item.trackerId}:${item.normalizedUrl}`, item] as const),
    );
    const activeSheetKeys = new Set<string>();
    const effectiveCountByType = new Map<string, number>();
    const usedTypes = new Set<string>();
    let newEvidence = 0;

    for (const [type, evidenceRows] of input.evidenceByType.entries()) {
      const tracker = trackerByType.get(type);
      if (!tracker) continue;
      usedTypes.add(type);
      let effectiveCount = 0;

      for (const evidence of evidenceRows) {
        const key = `${tracker.id}:${evidence.normalizedUrl}`;
        activeSheetKeys.add(key);
        const previous = existingByKey.get(key);
        if (previous) {
          await tx
            .update(dealDeliverableItems)
            .set({
              originalUrl: evidence.originalUrl,
              sourceRowIndex: evidence.rowIndex,
              sourceType: 'google_sheet',
              isActive: true,
              lastSeenAt: input.syncedAt,
            })
            .where(eq(dealDeliverableItems.id, previous.id));
          if (previous.status !== 'invalid' && previous.status !== 'rejected') {
            effectiveCount++;
          }
          continue;
        }

        const normalized = normalizeContentUrl(evidence.originalUrl);
        await tx.insert(dealDeliverableItems).values({
          trackerId: tracker.id,
          sourceRowIndex: evidence.rowIndex,
          originalUrl: evidence.originalUrl,
          normalizedUrl: evidence.normalizedUrl,
          platform: normalized.isValid ? normalized.platform : 'other',
          status: 'valid',
          sourceType: 'google_sheet',
          isActive: true,
          lastSeenAt: input.syncedAt,
          detectedAt: input.syncedAt,
        });
        newEvidence++;
        effectiveCount++;
      }
      effectiveCountByType.set(type, effectiveCount);
    }

    for (const item of existing) {
      if (item.sourceType !== 'google_sheet' || !item.isActive) continue;
      const key = `${item.trackerId}:${item.normalizedUrl}`;
      const tracker = input.trackers.find((row) => row.id === item.trackerId);
      if (!tracker) continue;
      const typeWasRead = input.evidenceByType.has(tracker.deliverableType);
      if (!input.resetMissingTypes && !typeWasRead) continue;
      if (activeSheetKeys.has(key)) continue;
      await tx
        .update(dealDeliverableItems)
        .set({ isActive: false })
        .where(eq(dealDeliverableItems.id, item.id));
    }

    let updated = 0;
    for (const tracker of input.trackers) {
      const typeWasRead = input.evidenceByType.has(tracker.deliverableType);
      if (!input.resetMissingTypes && !typeWasRead) continue;
      usedTypes.add(tracker.deliverableType);
      const currentCount = effectiveCountByType.get(tracker.deliverableType) ?? 0;
      await tx
        .update(dealDeliverableTrackers)
        .set({ currentCount, lastSyncedAt: input.syncedAt, updatedAt: input.syncedAt })
        .where(eq(dealDeliverableTrackers.id, tracker.id));
      if (tracker.currentCount !== currentCount) updated++;
    }

    await tx
      .update(campaigns)
      .set({
        lastTrackingSyncAt: input.syncedAt,
        lastEvidenceAddedAt: newEvidence > 0 ? input.syncedAt : undefined,
        trackingSyncError: null,
        updatedAt: input.syncedAt,
      })
      .where(eq(campaigns.id, input.campaignId));

    return { updated, usedTypes, newEvidence };
  });
}
