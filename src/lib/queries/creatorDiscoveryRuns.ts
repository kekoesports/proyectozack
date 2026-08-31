import { desc, eq } from 'drizzle-orm';

import { creatorDiscoveryRuns } from '@/db/schema';
import type { CreatorDiscoveryPlatformResult } from '@/db/schema/creatorDiscoveryRuns';
import { db } from '@/lib/db';

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
  const failures = platformResults.filter((result) => result.error !== null).length;
  const status = failures === 0
    ? 'success'
    : failures === platformResults.length
      ? 'failed'
      : 'partial';

  await db
    .update(creatorDiscoveryRuns)
    .set({
      status,
      foundCount: sum(platformResults, 'found'),
      qualifiedCount: sum(platformResults, 'qualified'),
      insertedCount: sum(platformResults, 'inserted'),
      updatedCount: sum(platformResults, 'updated'),
      platformResults: [...platformResults],
      completedAt: new Date(),
    })
    .where(eq(creatorDiscoveryRuns.id, id));
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

function sum(
  rows: readonly CreatorDiscoveryPlatformResult[],
  key: 'found' | 'qualified' | 'inserted' | 'updated',
): number {
  return rows.reduce((total, row) => total + row[key], 0);
}
