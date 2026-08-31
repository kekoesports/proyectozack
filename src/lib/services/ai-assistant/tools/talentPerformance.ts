import 'server-only';

import { getTalentIntelligenceDashboard } from '@/lib/queries/talentIntelligence';

export async function getTalentPerformanceSummary(): Promise<{
  readonly generatedAt: string;
  readonly coverage: Awaited<ReturnType<typeof getTalentIntelligenceDashboard>>['coverage'];
  readonly summary: Awaited<ReturnType<typeof getTalentIntelligenceDashboard>>['summary'];
  readonly improving: ReadonlyArray<Record<string, unknown>>;
  readonly attention: ReadonlyArray<Record<string, unknown>>;
  readonly dataQuality: ReadonlyArray<Record<string, unknown>>;
  readonly topContent: ReadonlyArray<Record<string, unknown>>;
}> {
  const dashboard = await getTalentIntelligenceDashboard();
  const comparable = dashboard.channels
    .filter((channel) => channel.growth[30].eligible)
    .sort((a, b) => (b.growth[30].score ?? -Infinity) - (a.growth[30].score ?? -Infinity));

  return {
    generatedAt: dashboard.generatedAt,
    coverage: dashboard.coverage,
    summary: dashboard.summary,
    improving: comparable.filter((channel) => (channel.growth[30].pct ?? 0) >= 1).slice(0, 8).map((channel) => ({
      talentId: channel.talentId,
      name: channel.talentName,
      platform: channel.platform,
      handle: channel.handle,
      audience: channel.currentAudience,
      growth30: channel.growth[30].absolute,
      growthPct30: channel.growth[30].pct,
      baselineDate: channel.growth[30].baselineDate,
      currentDate: channel.growth[30].currentDate,
    })),
    attention: comparable
      .filter((channel) => (channel.growth[30].pct ?? 0) < -0.25)
      .sort((a, b) => (a.growth[30].pct ?? 0) - (b.growth[30].pct ?? 0))
      .slice(0, 8)
      .map((channel) => ({
        talentId: channel.talentId,
        name: channel.talentName,
        platform: channel.platform,
        handle: channel.handle,
        growth30: channel.growth[30].absolute,
        growthPct30: channel.growth[30].pct,
      })),
    dataQuality: dashboard.channels
      .filter((channel) => !channel.growth[30].eligible)
      .slice(0, 20)
      .map((channel) => ({
        talentId: channel.talentId,
        name: channel.talentName,
        platform: channel.platform,
        handle: channel.handle,
        reason: channel.growth[30].reason,
        latestSnapshotAt: channel.latestSnapshotAt,
        coverageDays: channel.growth[30].coverageDays,
      })),
    topContent: dashboard.topContent.slice(0, 5).map((content) => ({
      talentId: content.talentId,
      talentName: content.talentName,
      title: content.title,
      views: content.views,
      publishedAt: content.publishedAt,
    })),
  };
}
