import { and, asc, eq, gte, inArray, isNotNull, lte, notExists, sql } from 'drizzle-orm';
import { creatorDigestOutbox, creatorDiscoveryRuns } from '@/db/schema';
import { db } from '@/lib/db';

/** No historical fallback, no provider reads, and no revisit of an existing delivery identity. */
export async function listCreatorRunsPendingReporting(since: Date, until: Date) {
  if (!Number.isFinite(since.getTime()) || !Number.isFinite(until.getTime()) || since > until) {
    throw new Error('creator_reporting_recovery_invalid_window');
  }
  return db.select({ id: creatorDiscoveryRuns.id, status: creatorDiscoveryRuns.status,
    startedAt: creatorDiscoveryRuns.startedAt, completedAt: creatorDiscoveryRuns.completedAt,
    platformResults: creatorDiscoveryRuns.platformResults }).from(creatorDiscoveryRuns).where(and(
    gte(creatorDiscoveryRuns.startedAt, since), lte(creatorDiscoveryRuns.completedAt, until),
    lte(creatorDiscoveryRuns.startedAt, creatorDiscoveryRuns.completedAt),
    inArray(creatorDiscoveryRuns.status, ['success', 'partial', 'failed']), isNotNull(creatorDiscoveryRuns.completedAt),
    notExists(db.select({ id: creatorDigestOutbox.id }).from(creatorDigestOutbox).where(
      // Literal prefix and a typed DB column only; no arbitrary identifier or user SQL.
      eq(creatorDigestOutbox.eventKey, sql`'creator-run:' || ${creatorDiscoveryRuns.id}::text`),
    )),
  )).orderBy(asc(creatorDiscoveryRuns.startedAt), asc(creatorDiscoveryRuns.id)).limit(5);
}
