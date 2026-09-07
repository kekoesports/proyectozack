import { and, asc, eq, gt, gte, ne } from 'drizzle-orm';

import { creatorAccounts, creatorLiveAudienceSamples, creatorProviderPermissions, targets } from '@/db/schema';
import { db } from '@/lib/db';
import type { AudienceSample } from '@/lib/targets/live-audience-samples';

export type LiveSamplePlatform = 'twitch' | 'kick';

export type LiveSamplingAccount = Readonly<{
  accountId: number;
  externalId: string;
  username: string;
}>;

export type NewLiveAudienceSample = Readonly<{
  accountId: number;
  platform: LiveSamplePlatform;
  categoryName: string;
  viewerCount: number | null;
  streamStartedAt: Date;
  observedAt: Date;
  expiresAt: Date;
  source: string;
}>;

export async function getLiveSamplingPlan(platform: LiveSamplePlatform): Promise<{
  accounts: readonly LiveSamplingAccount[];
  retentionDays: number | null;
}> {
  const [permission] = await db.select({ retentionDays: creatorProviderPermissions.retentionDays })
    .from(creatorProviderPermissions).where(eq(creatorProviderPermissions.platform, platform)).limit(1);
  const accounts = await db.select({
    accountId: creatorAccounts.id,
    externalId: creatorAccounts.externalId,
    username: creatorAccounts.username,
  }).from(creatorAccounts).innerJoin(targets, eq(creatorAccounts.targetId, targets.id)).where(and(
    eq(creatorAccounts.platform, platform),
    ne(targets.status, 'descartado'),
  )).orderBy(asc(creatorAccounts.id));
  return { accounts, retentionDays: permission?.retentionDays ?? null };
}

export async function insertLiveAudienceSamples(samples: readonly NewLiveAudienceSample[]): Promise<number> {
  if (samples.length === 0) return 0;
  const inserted = await db.insert(creatorLiveAudienceSamples).values([...samples])
    .onConflictDoNothing({
      target: [creatorLiveAudienceSamples.accountId, creatorLiveAudienceSamples.observedAt],
    }).returning({ id: creatorLiveAudienceSamples.id });
  return inserted.length;
}

export async function getRecentLiveAudienceSamples(accountId: number, now: Date): Promise<AudienceSample[]> {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  return db.select({
    viewerCount: creatorLiveAudienceSamples.viewerCount,
    observedAt: creatorLiveAudienceSamples.observedAt,
    streamStartedAt: creatorLiveAudienceSamples.streamStartedAt,
  }).from(creatorLiveAudienceSamples).where(and(
    eq(creatorLiveAudienceSamples.accountId, accountId),
    gte(creatorLiveAudienceSamples.observedAt, since),
    gt(creatorLiveAudienceSamples.expiresAt, now),
  )).orderBy(asc(creatorLiveAudienceSamples.observedAt));
}
