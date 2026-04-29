'use client';

import Image from 'next/image';
import { MetricsChart } from '@/features/admin/_shared/components/MetricsChart';
import { formatCompact } from '@/lib/utils/format';
import type { TalentMetricSnapshot } from '@/types';

type GrowthReportProps = {
  talentName: string;
  talentPhoto: string | null;
  from: string;
  to: string;
  snapshots: TalentMetricSnapshot[];
}

/**
 * Reporte de crecimiento (growth) de un talent: agrupa snapshots por plataforma
 * y renderiza un MetricsChart por cada una entre las fechas `from`/`to`.
 *
 * @kind client
 * @feature admin/analytics
 * @route /admin/analytics/report/[talentSlug]
 */
export function GrowthReport({ talentName, talentPhoto, from, to, snapshots }: GrowthReportProps): React.ReactElement {
  // Group by platform
  const byPlatform = new Map<string, TalentMetricSnapshot[]>();
  for (const s of snapshots) {
    if (!byPlatform.has(s.platform)) byPlatform.set(s.platform, []);
    byPlatform.get(s.platform)!.push(s);
  }

  // Build chart data per platform
  const platforms = Array.from(byPlatform.entries()).map(([platform, snaps]) => {
    const sorted = [...snaps].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const days = Math.max(
      Math.ceil((new Date(last.snapshotDate).getTime() - new Date(first.snapshotDate).getTime()) / (1000 * 60 * 60 * 24)),
      1,
    );
    const pct = first.value > 0 ? ((last.value - first.value) / first.value) * 100 : null;
    const label = platform === 'youtube' ? 'YouTube Subscribers' : 'Twitch Followers';

    const chartData = sorted.map((s) => ({
      date: s.snapshotDate,
      [label]: s.value,
    }));

    return { platform, label, first, last, days, pct, chartData };
  });

  const fromFormatted = new Date(from).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const toFormatted = new Date(to).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-3xl mx-auto print:max-w-none">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8 print:mb-6">
        <div>
          <div className="font-display text-sm font-bold uppercase gradient-text mb-1">SocialPro</div>
          <div className="font-display text-3xl font-black uppercase text-sp-admin-text">{talentName}</div>
          <div className="text-sm text-sp-admin-muted mt-1">
            Growth Report: {fromFormatted} &mdash; {toFormatted}
          </div>
        </div>
        {talentPhoto && (
          <Image
            src={talentPhoto}
            alt={talentName}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover border-2 border-sp-admin-border"
          />
        )}
      </div>

      {/* Per-platform sections */}
      {platforms.map(({ platform, label, first, last, days, pct, chartData }) => (
        <div key={platform} className="mb-10 print:mb-8">
          <h2 className="font-display text-xl font-bold uppercase text-sp-admin-text mb-4">{label}</h2>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border p-4">
              <div className="text-xs text-sp-admin-muted">Start</div>
              <div className="font-display text-2xl font-black text-sp-admin-text">{formatCompact(first.value)}</div>
            </div>
            <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border p-4">
              <div className="text-xs text-sp-admin-muted">Current</div>
              <div className="font-display text-2xl font-black text-sp-admin-text">{formatCompact(last.value)}</div>
            </div>
            <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border p-4">
              <div className="text-xs text-sp-admin-muted">Growth</div>
              <div className={`font-display text-2xl font-black ${
                (pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {pct !== null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : `+${formatCompact(last.value - first.value)}`}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-sp-admin-border p-4 bg-sp-admin-card print:border-0">
            <MetricsChart
              data={chartData}
              lines={[{
                key: label,
                color: platform === 'youtube' ? '#FF0000' : '#9146FF',
                name: label,
              }]}
              height={300}
            />
          </div>

          {/* Summary sentence */}
          <p className="text-sm text-sp-admin-muted mt-3">
            {label} grew from {formatCompact(first.value)} to {formatCompact(last.value)}
            {pct !== null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)` : ''} in {days} days.
          </p>
        </div>
      ))}

      {/* Footer */}
      <div className="border-t border-sp-admin-border pt-4 mt-8 text-xs text-sp-admin-muted print:mt-4">
        Generated by SocialPro on {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}
