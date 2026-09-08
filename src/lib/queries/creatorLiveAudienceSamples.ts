import { and, asc, eq, gt, gte, inArray, ne } from 'drizzle-orm';

import { creatorAccounts, creatorLiveAudienceSamples, creatorProviderPermissions, targets } from '@/db/schema';
import { db } from '@/lib/db';
import type { AudienceSample } from '@/lib/targets/live-audience-samples';
import { summarizeLiveAudience } from '@/lib/targets/live-audience-samples';
import { hasMinimumCreatorFollowers } from '@/lib/targets/audience-thresholds';

export type LiveSamplePlatform = 'twitch' | 'kick';

export type LiveSamplingAccount = Readonly<{
  accountId: number;
  targetId: number;
  externalId: string;
  username: string;
  followers: number | null;
  qualificationStatus: string;
  fitReasons: string[];
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
    targetId: targets.id,
    externalId: creatorAccounts.externalId,
    username: creatorAccounts.username,
    followers: targets.followers,
    qualificationStatus: targets.qualificationStatus,
    fitReasons: targets.fitReasons,
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
    platform: creatorLiveAudienceSamples.platform,
    categoryName: creatorLiveAudienceSamples.categoryName,
    viewerCount: creatorLiveAudienceSamples.viewerCount,
    observedAt: creatorLiveAudienceSamples.observedAt,
    streamStartedAt: creatorLiveAudienceSamples.streamStartedAt,
    source: creatorLiveAudienceSamples.source,
  }).from(creatorLiveAudienceSamples).where(and(
    eq(creatorLiveAudienceSamples.accountId, accountId),
    gte(creatorLiveAudienceSamples.observedAt, since),
    gt(creatorLiveAudienceSamples.expiresAt, now),
  )).orderBy(asc(creatorLiveAudienceSamples.observedAt));
}

export async function refreshTwitchLiveAudienceQualifications(
  accounts: readonly LiveSamplingAccount[],
  now: Date,
): Promise<number> {
  if (accounts.length === 0) return 0;
  const samplesById = await getRecentLiveAudienceSamplesByExternalIds(
    'twitch', accounts.map(account => account.externalId), now,
  );
  let updated = 0;
  for (const account of accounts) {
    const followerQualified = hasMinimumCreatorFollowers('twitch', account.followers);
    const summary = summarizeLiveAudience(samplesById.get(account.externalId) ?? []);
    const qualificationStatus = account.followers === null || summary.quality === 'insufficient'
      ? 'review' : followerQualified && summary.quality === 'green' ? 'qualified' : 'rejected';
    const fitReasons = account.followers === null
      ? ['Seguidores de Twitch no disponibles; requiere verificación.']
      : summary.quality === 'insufficient'
        ? [`${account.followers.toLocaleString('es-ES')} seguidores; ${summary.measuredMinutes}/60 minutos medidos con el recolector completo.`]
        : [
          `${account.followers.toLocaleString('es-ES')} seguidores ${followerQualified ? '(supera 10.000)' : '(no supera 10.000)'}.`,
          `Media verificada de 30 días: ${summary.averageViewers ?? 'sin dato'} espectadores.`,
          `Contenido CS2: ${Math.round((summary.cs2ContentShare ?? 0) * 100)}% del tiempo medido.`,
          'Cualquier idioma admitido.',
        ];
    if (account.qualificationStatus === qualificationStatus
      && JSON.stringify(account.fitReasons) === JSON.stringify(fitReasons)) continue;
    const rows = await db.update(targets).set({ qualificationStatus, fitReasons,
      qualificationUpdatedAt: now, updatedAt: now }).where(and(
      eq(targets.id, account.targetId),
      eq(targets.status, 'pendiente'),
    )).returning({ id: targets.id });
    updated += rows.length;
  }
  return updated;
}

export async function getRecentLiveAudienceSamplesByExternalIds(
  platform: LiveSamplePlatform,
  externalIds: readonly string[],
  now: Date,
): Promise<ReadonlyMap<string, AudienceSample[]>> {
  if (externalIds.length === 0) return new Map();
  const accounts = await db.select({ id: creatorAccounts.id, externalId: creatorAccounts.externalId })
    .from(creatorAccounts).where(and(
      eq(creatorAccounts.platform, platform),
      inArray(creatorAccounts.externalId, [...new Set(externalIds)]),
    ));
  if (accounts.length === 0) return new Map();
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const rows = await db.select({
    accountId: creatorLiveAudienceSamples.accountId,
    platform: creatorLiveAudienceSamples.platform,
    categoryName: creatorLiveAudienceSamples.categoryName,
    viewerCount: creatorLiveAudienceSamples.viewerCount,
    observedAt: creatorLiveAudienceSamples.observedAt,
    streamStartedAt: creatorLiveAudienceSamples.streamStartedAt,
    source: creatorLiveAudienceSamples.source,
  }).from(creatorLiveAudienceSamples).where(and(
    inArray(creatorLiveAudienceSamples.accountId, accounts.map(account => account.id)),
    gte(creatorLiveAudienceSamples.observedAt, since),
    gt(creatorLiveAudienceSamples.expiresAt, now),
  )).orderBy(asc(creatorLiveAudienceSamples.observedAt));
  const externalIdByAccount = new Map(accounts.map(account => [account.id, account.externalId]));
  const samplesByExternalId = new Map<string, AudienceSample[]>();
  for (const row of rows) {
    const externalId = externalIdByAccount.get(row.accountId);
    if (!externalId) continue;
    const samples = samplesByExternalId.get(externalId) ?? [];
    samples.push(row);
    samplesByExternalId.set(externalId, samples);
  }
  return samplesByExternalId;
}
