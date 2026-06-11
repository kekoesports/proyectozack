'use client';

import { useState } from 'react';
import type { PipelinePoint } from '@/lib/queries/dashboard';

type Range = '7d' | '30d' | '90d';

const RANGE_TABS: Array<{ key: Range; label: string }> = [
  { key: '7d',  label: '7d'  },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
];

function buildPaths(data: PipelinePoint[], w: number, h: number): { line: string; area: string } {
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padX = 2;
  const padY = 8;
  const n = values.length;

  const pts = values.map((v, i) => ({
    x: padX + (n > 1 ? i / (n - 1) : 0.5) * (w - 2 * padX),
    y: padY + (1 - (v - min) / range) * (h - 2 * padY),
  }));

  const first = pts[0] ?? { x: padX, y: h / 2 };
  const last = pts[pts.length - 1] ?? first;

  let line = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    if (!prev || !curr) continue;
    const cpx = (prev.x + curr.x) / 2;
    line += ` C ${cpx.toFixed(1)} ${prev.y.toFixed(1)},${cpx.toFixed(1)} ${curr.y.toFixed(1)},${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  const area = `${line} L ${last.x.toFixed(1)} ${h} L ${first.x.toFixed(1)} ${h} Z`;
  return { line, area };
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

type PipelineChartCardProps = {
  readonly total: number;
  readonly trend?: number;
  readonly data7d: readonly PipelinePoint[];
  readonly data30d: readonly PipelinePoint[];
  readonly data90d: readonly PipelinePoint[];
};

export function PipelineChartCard({ total, trend = 0, data7d, data30d, data90d }: PipelineChartCardProps): React.ReactElement {
  const [range, setRange] = useState<Range>('30d');

  const rangeData: Record<Range, readonly PipelinePoint[]> = { '7d': data7d, '30d': data30d, '90d': data90d };
  const activeData = rangeData[range];
  const { line, area } = buildPaths([...activeData], 300, 80);

  const lastLabel = activeData[activeData.length - 1]?.date ?? '';
  const firstLabel = activeData[0]?.date ?? '';

  return (
    <section className="flex flex-col rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
          Evolución del pipeline
        </h2>
        {/* Range tabs */}
        <div className="flex items-center gap-0.5 bg-sp-admin-bg rounded-lg p-0.5">
          {RANGE_TABS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                range === r.key
                  ? 'bg-white text-sp-admin-text shadow-sm'
                  : 'text-sp-admin-muted hover:text-sp-admin-text'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Total + trend */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-bold text-sp-admin-text tabular-nums">
              {formatEur(total)}
            </span>
            {trend !== 0 && (
              <span className={`text-[11px] font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-sp-admin-muted mt-0.5">
            Facturas pendientes de cobro · evolución por periodo
          </p>
        </div>

        {/* SVG chart */}
        <div className="w-full">
          <svg
            viewBox="0 0 300 80"
            className="w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pipe-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b3aad" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8b3aad" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path d={area} fill="url(#pipe-fill)" />
            {/* Line */}
            <path d={line} fill="none" stroke="#8b3aad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* X axis labels */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-sp-admin-muted/60">{firstLabel}</span>
          <span className="text-[9px] text-sp-admin-muted/60">{lastLabel}</span>
        </div>
      </div>
    </section>
  );
}
