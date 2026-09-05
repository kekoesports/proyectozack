import { desc, eq } from 'drizzle-orm';

import { creatorDiscoveryRuns } from '@/db/schema';
import type { CreatorDiscoveryPlatformResult } from '@/db/schema/creatorDiscoveryRuns';
import { db } from '@/lib/db';
import { creatorDiscoveryStatus, sumDiscoveryResults } from '@/lib/targets/discovery-result';
import { recordCreatorRunReporting } from '@/lib/queries/creatorDiscoveryReporting';
import { CreatorDiscoveryReportingPendingError } from '@/lib/services/creator-reporting-status';

export type CreatorDiscoveryRun = typeof creatorDiscoveryRuns.$inferSelect;

export async function startCreatorDiscoveryRun(
  trigger: 'manual' | 'scheduled',
): Promise<number> {
  const [row] = await db
    .insert(creatorDiscoveryRuns)
    .values({ trigger, status: 'running' })
    .returning({ id: creatorDiscoveryRuns.id });
  if (!row) throw new Error('creator discovery run was not created');
  return row.id;
}

export async function finishCreatorDiscoveryRun(
  id: number,
  platformResults: readonly CreatorDiscoveryPlatformResult[],
): Promise<void> {
  const status = creatorDiscoveryStatus(platformResults);
  const completedAt = new Date();
  const [run] = await db.select({ startedAt: creatorDiscoveryRuns.startedAt }).from(creatorDiscoveryRuns).where(eq(creatorDiscoveryRuns.id, id));

  await db
    .update(creatorDiscoveryRuns)
    .set({
      status,
      foundCount: sumDiscoveryResults(platformResults, 'found'),
      qualifiedCount: sumDiscoveryResults(platformResults, 'qualified'),
      insertedCount: sumDiscoveryResults(platformResults, 'inserted'),
      updatedCount: sumDiscoveryResults(platformResults, 'updated'),
      platformResults: [...platformResults],
      completedAt,
    })
    .where(eq(creatorDiscoveryRuns.id, id));
  if (run) {
    try { await recordCreatorRunReporting(id, run.startedAt, platformResults, { completedAt }); }
    catch { throw new CreatorDiscoveryReportingPendingError(); }
  }
}

export async function listRecentCreatorDiscoveryRuns(
  limit = 5,
): Promise<CreatorDiscoveryRun[]> {
  return db
    .select()
    .from(creatorDiscoveryRuns)
    .orderBy(desc(creatorDiscoveryRuns.startedAt))
    .limit(Math.max(1, Math.min(limit, 20)));
}
