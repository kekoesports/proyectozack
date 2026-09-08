import { NextRequest, NextResponse } from 'next/server';

import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { getCreatorProviderReadiness } from '@/lib/queries/creatorProviderReadiness';
import { getLiveSamplingPlan, insertLiveAudienceSamples, refreshTwitchLiveAudienceQualifications, type LiveSamplePlatform } from '@/lib/queries/creatorLiveAudienceSamples';
import { twitchAudienceSamples, kickAudienceSamples } from '@/lib/services/creator-live-audience-collector';
import { fetchTwitchLiveByLogins } from '@/lib/services/twitch';
import { getKickLiveByBroadcasterIds } from '@/lib/services/kick';
import { LIVE_AUDIENCE_WINDOW_DAYS } from '@/lib/targets/live-audience-samples';

export const dynamic = 'force-dynamic';
const PLATFORMS: readonly LiveSamplePlatform[] = ['twitch', 'kick'];

type PlatformResult = Readonly<{
  platform: LiveSamplePlatform;
  checked: number;
  inserted: number;
  status: 'ok' | 'skipped' | 'failed';
  reason?: string;
}>;

async function collectPlatform(platform: LiveSamplePlatform, now: Date): Promise<PlatformResult> {
  const gates = await getCreatorProviderReadiness();
  const gate = gates.find(item => item.platform === platform);
  if (!gate?.ready) return { platform, checked: 0, inserted: 0, status: 'skipped', reason: gate?.code ?? 'NOT_READY' };
  const plan = await getLiveSamplingPlan(platform);
  if (plan.retentionDays === null || plan.retentionDays < LIVE_AUDIENCE_WINDOW_DAYS) {
    return { platform, checked: plan.accounts.length, inserted: 0, status: 'skipped', reason: 'RETENTION_BELOW_MEASUREMENT_WINDOW' };
  }
  if (plan.accounts.length === 0) return { platform, checked: 0, inserted: 0, status: 'ok' };
  const context = {
    observedAt: now,
    expiresAt: new Date(now.getTime() + plan.retentionDays * 86_400_000),
  };
  if (platform === 'twitch') {
    const streams = await fetchTwitchLiveByLogins(plan.accounts.map(account => account.username));
    const inserted = await insertLiveAudienceSamples(twitchAudienceSamples(plan.accounts, streams, context));
    await refreshTwitchLiveAudienceQualifications(plan.accounts, now);
    return { platform, checked: plan.accounts.length, inserted, status: 'ok' };
  }
  const ids = plan.accounts.map(account => Number(account.externalId))
    .filter(idValue => Number.isSafeInteger(idValue) && idValue > 0);
  if (ids.length !== plan.accounts.length) {
    return { platform, checked: plan.accounts.length, inserted: 0, status: 'skipped', reason: 'INVALID_PROVIDER_IDS' };
  }
  const report = await getKickLiveByBroadcasterIds(ids);
  if (report.coverage.status === 'unavailable') {
    return { platform, checked: plan.accounts.length, inserted: 0, status: 'failed', reason: report.coverage.warnings[0] ?? 'PROVIDER_UNAVAILABLE' };
  }
  const inserted = await insertLiveAudienceSamples(kickAudienceSamples(plan.accounts, report.items, context));
  return { platform, checked: plan.accounts.length, inserted, status: report.coverage.status === 'complete' ? 'ok' : 'failed',
    ...(report.coverage.status === 'partial' ? { reason: report.coverage.warnings[0] ?? 'PARTIAL_COVERAGE' } : {}) };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;
  const now = new Date();
  const results: PlatformResult[] = [];
  for (const platform of PLATFORMS) {
    try {
      results.push(await collectPlatform(platform, now));
    } catch {
      results.push({ platform, checked: 0, inserted: 0, status: 'failed', reason: 'COLLECTION_FAILED' });
    }
  }
  return NextResponse.json({
    ok: results.every(result => result.status !== 'failed'),
    observedAt: now.toISOString(),
    results,
  });
}
