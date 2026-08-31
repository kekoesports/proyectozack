import 'server-only';

import { getTalentIntelligenceDashboard } from '@/lib/queries/talentIntelligence';

export async function getTalentPerformanceSummary(): Promise<{
  readonly generatedAt: string;
  readonly coverage: Awaited<ReturnType<typeof getTalentIntelligenceDashboard>>['coverage'];
  readonly summary: Awaited<ReturnType<typeof getTalentIntelligenceDashboard>>['summary'];
  readonly improving: ReadonlyArray<Record<string, unknown>>;
  readonly attention: ReadonlyArray<Record<string, unknown>>;
  readonly topContent: ReadonlyArray<Record<string, unknown>>;
}> {
  const dashboard = await getTalentIntelligenceDashboard();
  const byGrowth = [...dashboard.creators]
    .filter((creator) => creator.growthPct30 !== null)
    .sort((a, b) => (b.growthPct30 ?? 0) - (a.growthPct30 ?? 0));

  return {
    generatedAt: dashboard.generatedAt,
    coverage: dashboard.coverage,
    summary: dashboard.summary,
    improving: byGrowth.slice(0, 8).map((creator) => ({
      talentId: creator.id,
      name: creator.name,
      audience: creator.totalAudience,
      growth30: creator.growth30,
      growthPct30: creator.growthPct30,
      reason: creator.reason,
    })),
    attention: dashboard.creators
      .filter((creator) => creator.direction === 'falling' || creator.stale)
      .sort((a, b) => Number(b.stale) - Number(a.stale) || (a.growthPct30 ?? 0) - (b.growthPct30 ?? 0))
      .slice(0, 8)
      .map((creator) => ({
        talentId: creator.id,
        name: creator.name,
        growth30: creator.growth30,
        growthPct30: creator.growthPct30,
        stale: creator.stale,
        reason: creator.reason,
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
