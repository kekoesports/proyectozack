import { count, eq, isNull, sql } from 'drizzle-orm';

import {
  dealDeliverableItems,
  dealDeliverableTrackers,
} from '@/db/schema/dealDeliverableTrackers';
import { db } from '@/lib/db';

export type TrackerReconciliationPreflight = {
  readonly trackersTotal: number;
  readonly trackersUnlinked: number;
  readonly trackersUnreconciled: number;
  readonly itemsOnUnlinked: number;
  readonly activeValidOnUnlinked: number;
  readonly sameTrackerUrlGroups: number;
  readonly sameTrackerUrlExtraRows: number;
  readonly crossTrackerUrlGroups: number;
  readonly crossTrackerUrlExtraRows: number;
};

function asInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function extraFromGroups(groups: readonly { cnt: number }[]): {
  readonly groups: number;
  readonly extra: number;
} {
  let extra = 0;
  for (const row of groups) extra += Math.max(asInt(row.cnt) - 1, 0);
  return { groups: groups.length, extra };
}

/** Aggregate-only read. No names, URLs, emails or amounts. */
export async function getTrackerReconciliationPreflight(): Promise<TrackerReconciliationPreflight> {
  const [trackerRow] = await db
    .select({
      total: count(),
      unlinked: sql<number>`count(*) filter (where ${dealDeliverableTrackers.campaignId} is null)`,
      unreconciled: sql<number>`count(*) filter (where ${dealDeliverableTrackers.campaignId} is null and ${dealDeliverableTrackers.reconciliationStatus} = 'unreconciled')`,
    })
    .from(dealDeliverableTrackers);

  const [itemsOnUnlinked] = await db
    .select({
      items: count(),
      activeValid: sql<number>`count(*) filter (where ${dealDeliverableItems.isActive} and ${dealDeliverableItems.status} in ('valid','approved'))`,
    })
    .from(dealDeliverableItems)
    .innerJoin(
      dealDeliverableTrackers,
      eq(dealDeliverableItems.trackerId, dealDeliverableTrackers.id),
    )
    .where(isNull(dealDeliverableTrackers.campaignId));

  const sameTrackerRows = await db
    .select({
      cnt: sql<number>`count(*)::int`,
    })
    .from(dealDeliverableItems)
    .groupBy(dealDeliverableItems.trackerId, dealDeliverableItems.normalizedUrl)
    .having(sql`count(*) > 1`);

  const crossTrackerRows = await db
    .select({
      cnt: sql<number>`count(*)::int`,
    })
    .from(dealDeliverableItems)
    .groupBy(dealDeliverableItems.normalizedUrl)
    .having(sql`count(*) > 1`);

  const same = extraFromGroups(sameTrackerRows);
  const cross = extraFromGroups(crossTrackerRows);

  return {
    trackersTotal: asInt(trackerRow?.total),
    trackersUnlinked: asInt(trackerRow?.unlinked),
    trackersUnreconciled: asInt(trackerRow?.unreconciled),
    itemsOnUnlinked: asInt(itemsOnUnlinked?.items),
    activeValidOnUnlinked: asInt(itemsOnUnlinked?.activeValid),
    sameTrackerUrlGroups: same.groups,
    sameTrackerUrlExtraRows: same.extra,
    crossTrackerUrlGroups: cross.groups,
    crossTrackerUrlExtraRows: cross.extra,
  };
}
