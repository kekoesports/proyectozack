import 'server-only';

import { and, count, desc, eq, gt, inArray, isNull, lt } from 'drizzle-orm';

import { agentEvents, newsAlerts, posts, pressTargets, targets } from '@/db/schema';
import { db } from '@/lib/db';

function firstCount(rows: readonly { total: number }[]): number {
  return rows[0]?.total ?? 0;
}

export async function getOperationsSummary(): Promise<{
  readonly creatorTargets: { readonly total: number; readonly pending: number; readonly complianceReady: number };
  readonly press: { readonly freeActive: number; readonly pending: number; readonly published: number };
  readonly editorial: { readonly unreadAlerts: number; readonly scheduledNext14Days: number };
  readonly backup: {
    readonly status: 'healthy' | 'warning' | 'failed' | 'unknown';
    readonly ageHours: number | null;
    readonly lastSignalAt: string | null;
    readonly latestFailureAt: string | null;
  };
}> {
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1_000);

  const [
    targetTotalRows,
    targetPendingRows,
    complianceReadyRows,
    pressFreeRows,
    pressPendingRows,
    pressPublishedRows,
    unreadAlertRows,
    scheduledRows,
    heartbeatRows,
    failureRows,
  ] = await Promise.all([
    db.select({ total: count() }).from(targets),
    db.select({ total: count() }).from(targets).where(eq(targets.status, 'pendiente')),
    db.select({ total: count() }).from(targets).where(
      inArray(targets.complianceStatus, ['marketplace-scope-only', 'operator-check-required']),
    ),
    db.select({ total: count() }).from(pressTargets).where(and(
      eq(pressTargets.isActive, true),
      inArray(pressTargets.costModel, ['gratuito-editorial', 'gratuito-autopublicacion']),
    )),
    db.select({ total: count() }).from(pressTargets).where(eq(pressTargets.outreachStatus, 'pendiente')),
    db.select({ total: count() }).from(pressTargets).where(eq(pressTargets.outreachStatus, 'publicado')),
    db.select({ total: count() }).from(newsAlerts).where(and(
      isNull(newsAlerts.readAt),
      isNull(newsAlerts.dismissedAt),
    )),
    db.select({ total: count() }).from(posts).where(and(
      eq(posts.status, 'published'),
      gt(posts.publishedAt, now),
      lt(posts.publishedAt, in14Days),
    )),
    db.select().from(agentEvents).where(eq(agentEvents.eventType, 'backup.heartbeat'))
      .orderBy(desc(agentEvents.occurredAt)).limit(1),
    db.select().from(agentEvents).where(eq(agentEvents.eventType, 'backup.failed'))
      .orderBy(desc(agentEvents.occurredAt)).limit(1),
  ]);

  const heartbeat = heartbeatRows[0] ?? null;
  const failure = failureRows[0] ?? null;
  const payloadAge = heartbeat?.payloadJson.ageHours;
  const ageHours = typeof payloadAge === 'number' && Number.isFinite(payloadAge) ? payloadAge : null;
  const failureAfterHeartbeat = Boolean(
    failure && (!heartbeat || failure.occurredAt.getTime() > heartbeat.occurredAt.getTime()),
  );
  const backupStatus = failureAfterHeartbeat
    ? 'failed'
    : ageHours === null
      ? 'unknown'
      : ageHours > 8
        ? 'warning'
        : 'healthy';

  return {
    creatorTargets: {
      total: firstCount(targetTotalRows),
      pending: firstCount(targetPendingRows),
      complianceReady: firstCount(complianceReadyRows),
    },
    press: {
      freeActive: firstCount(pressFreeRows),
      pending: firstCount(pressPendingRows),
      published: firstCount(pressPublishedRows),
    },
    editorial: {
      unreadAlerts: firstCount(unreadAlertRows),
      scheduledNext14Days: firstCount(scheduledRows),
    },
    backup: {
      status: backupStatus,
      ageHours,
      lastSignalAt: heartbeat?.occurredAt.toISOString() ?? null,
      latestFailureAt: failure?.occurredAt.toISOString() ?? null,
    },
  };
}
