import 'server-only';

import { desc, eq } from 'drizzle-orm';

import { agentEvents } from '@/db/schema';
import { db } from '@/lib/db';

export type BackupHealthSummary = {
  readonly status: 'healthy' | 'warning' | 'failed' | 'unknown';
  readonly ageHours: number | null;
  readonly lastBackupAt: string | null;
  readonly lastSignalAt: string | null;
  readonly latestFailureAt: string | null;
};

export async function getBackupHealthSummary(): Promise<BackupHealthSummary> {
  const [heartbeats, failures] = await Promise.all([
    db.select().from(agentEvents).where(eq(agentEvents.eventType, 'backup.heartbeat'))
      .orderBy(desc(agentEvents.occurredAt)).limit(1),
    db.select().from(agentEvents).where(eq(agentEvents.eventType, 'backup.failed'))
      .orderBy(desc(agentEvents.occurredAt)).limit(1),
  ]);

  const heartbeat = heartbeats[0] ?? null;
  const failure = failures[0] ?? null;
  const payloadAge = heartbeat?.payloadJson.ageHours;
  const ageHours = typeof payloadAge === 'number' && Number.isFinite(payloadAge) ? payloadAge : null;
  const failureAfterHeartbeat = Boolean(
    failure && (!heartbeat || failure.occurredAt.getTime() > heartbeat.occurredAt.getTime()),
  );
  const status = failureAfterHeartbeat
    ? 'failed'
    : ageHours === null
      ? 'unknown'
      : ageHours <= 8
        ? 'healthy'
        : ageHours <= 26
          ? 'warning'
          : 'failed';
  const lastBackupAt = heartbeat && ageHours !== null
    ? new Date(heartbeat.occurredAt.getTime() - ageHours * 60 * 60 * 1_000).toISOString()
    : null;

  return {
    status,
    ageHours,
    lastBackupAt,
    lastSignalAt: heartbeat?.occurredAt.toISOString() ?? null,
    latestFailureAt: failure?.occurredAt.toISOString() ?? null,
  };
}
