export const TALENT_GROWTH_PERIODS = [30, 60, 90, 120] as const;

export type TalentGrowthPeriod = (typeof TALENT_GROWTH_PERIODS)[number];

export type ComparableChannelSnapshot = {
  readonly snapshotDate: string;
  readonly followers: number;
};

export type TalentGrowthMetric = {
  readonly period: TalentGrowthPeriod;
  readonly eligible: boolean;
  readonly absolute: number;
  readonly pct: number | null;
  readonly score: number | null;
  readonly baselineFollowers: number | null;
  readonly currentFollowers: number | null;
  readonly baselineDate: string | null;
  readonly currentDate: string | null;
  readonly coverageDays: number;
  readonly points: number;
  readonly reason: 'valid' | 'stale' | 'not-enough-history' | 'missing-audience' | 'inconsistent-history';
};

const DAY_MS = 86_400_000;
const FRESHNESS_DAYS = 8;
const MIN_COVERAGE_RATIO = 0.8;
const MAX_COVERAGE_RATIO = 1.2;

/**
 * Produces a defensible channel-to-channel comparison.
 *
 * A row is never ranked if its current value is stale, its audience is zero,
 * or the nearest baseline does not cover between 80% and 120% of the selected
 * window. This prevents a five-day change from being presented as a 30-day
 * result and keeps missing profiles out of the leaderboard.
 */
export function calculateComparableGrowth(
  snapshots: readonly ComparableChannelSnapshot[],
  period: TalentGrowthPeriod,
  asOfDate: string,
): TalentGrowthMetric {
  const rows = [...snapshots]
    .filter((row) => Number.isFinite(row.followers) && isDate(row.snapshotDate))
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  const latest = rows.at(-1) ?? null;

  if (!latest || latest.followers <= 0) {
    return invalidMetric(period, rows.length, 'missing-audience', latest);
  }

  const latestAge = differenceDays(latest.snapshotDate, asOfDate);
  if (latestAge > FRESHNESS_DAYS) {
    return invalidMetric(period, rows.length, 'stale', latest);
  }

  if (hasInconsistentHistory(rows)) {
    return invalidMetric(period, rows.length, 'inconsistent-history', latest);
  }

  const candidates = rows.slice(0, -1).map((row) => ({
    row,
    coverageDays: differenceDays(row.snapshotDate, latest.snapshotDate),
  }));
  const minimumCoverage = Math.ceil(period * MIN_COVERAGE_RATIO);
  const maximumCoverage = Math.ceil(period * MAX_COVERAGE_RATIO);
  const baseline = candidates
    .filter(({ row, coverageDays }) => row.followers > 0 && coverageDays >= minimumCoverage && coverageDays <= maximumCoverage)
    .sort((a, b) => Math.abs(a.coverageDays - period) - Math.abs(b.coverageDays - period))[0] ?? null;

  if (!baseline) {
    const oldest = rows[0] ?? latest;
    return {
      ...invalidMetric(period, rows.length, 'not-enough-history', latest),
      coverageDays: differenceDays(oldest.snapshotDate, latest.snapshotDate),
    };
  }

  const absolute = latest.followers - baseline.row.followers;
  const pct = (absolute / baseline.row.followers) * 100;
  const scaleConfidence = Math.min(1, Math.max(0.35, Math.log10(Math.max(10, baseline.row.followers)) / 5));
  const coverageConfidence = Math.min(1, baseline.coverageDays / period);

  return {
    period,
    eligible: true,
    absolute,
    pct,
    score: pct * scaleConfidence * coverageConfidence,
    baselineFollowers: baseline.row.followers,
    currentFollowers: latest.followers,
    baselineDate: baseline.row.snapshotDate,
    currentDate: latest.snapshotDate,
    coverageDays: baseline.coverageDays,
    points: rows.length,
    reason: 'valid',
  };
}

function invalidMetric(
  period: TalentGrowthPeriod,
  points: number,
  reason: Exclude<TalentGrowthMetric['reason'], 'valid'>,
  latest: ComparableChannelSnapshot | null,
): TalentGrowthMetric {
  return {
    period,
    eligible: false,
    absolute: 0,
    pct: null,
    score: null,
    baselineFollowers: null,
    currentFollowers: latest?.followers ?? null,
    baselineDate: null,
    currentDate: latest?.snapshotDate ?? null,
    coverageDays: 0,
    points,
    reason,
  };
}

function differenceDays(earlier: string, later: string): number {
  return Math.max(0, Math.round((dateValue(later) - dateValue(earlier)) / DAY_MS));
}

function dateValue(value: string): number {
  return new Date(`${value}T12:00:00Z`).getTime();
}

function isDate(value: string): boolean {
  return Number.isFinite(dateValue(value));
}

/** Two opposite four-fold jumps in one series are a source mix/reset, not growth. */
function hasInconsistentHistory(rows: readonly ComparableChannelSnapshot[]): boolean {
  let abruptChanges = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]?.followers ?? 0;
    const current = rows[index]?.followers ?? 0;
    if (previous <= 0 || current <= 0) continue;
    const ratio = current / previous;
    if (ratio >= 4 || ratio <= 0.25) abruptChanges += 1;
    if (abruptChanges >= 2) return true;
  }
  return false;
}
