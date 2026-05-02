'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCompact } from '@/lib/utils/format';

type ChartDataPoint = {
  date: string;
  [creatorOrPlatform: string]: string | number;
}

type MetricsChartProps = {
  data: ChartDataPoint[];
  lines: Array<{ key: string; color: string; name: string }>;
  height?: number;
  yAxisLabel?: string;
}

const tooltipStyle: React.CSSProperties = {
  borderRadius: '8px',
  border: '1px solid #e2ddd8',
  boxShadow: '0 4px 16px -4px rgba(0,0,0,0.1)',
  fontSize: '11px',
  padding: '8px 12px',
  lineHeight: '1.5',
};

const labelStyle = { fontWeight: 700, color: '#1a1a1a', fontSize: 11, marginBottom: 4 };

const axisTick = { fontSize: 10, fill: '#a8a39d', fontFamily: 'Inter, sans-serif' };

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-sp-muted/60">
      <div className="w-12 h-8 mb-3 flex items-end gap-[3px]">
        {[40, 65, 50, 80, 60].map((h, i) => (
          <div key={i} className="flex-1 bg-sp-border/60 rounded-t-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
      <span className="text-[12px] font-medium">No data for this period</span>
      <span className="text-[11px] mt-0.5">Adjust the date range or filters</span>
    </div>
  );
}

/** Horizontal bar chart for single-date snapshots */
function SinglePointBarChart({ data, lines, height }: MetricsChartProps & { height: number }) {
  const point = data[0];
  if (!point) return <EmptyState />;
  const barData = lines
    .map((l) => ({
      name: l.name,
      value: Number(point[l.key] ?? 0),
      color: l.color,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (barData.length === 0) return <EmptyState />;

  const chartHeight = Math.max(height, barData.length * 36 + 40);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceae6" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatCompact}
          tick={axisTick}
          stroke="transparent"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: '#6b6864', fontFamily: 'Inter, sans-serif' }}
          width={130}
          stroke="transparent"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [formatCompact(Number(value)), 'Followers']}
          labelStyle={labelStyle}
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(245, 99, 42, 0.04)' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
          {barData.map((d, i) => (
            <rect key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Custom legend — compact, no-frills */
function ChartLegend({ lines }: { lines: MetricsChartProps['lines'] }) {
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-sp-border/40">
      {lines.slice(0, 10).map((l) => (
        <div key={l.key} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
          <span className="text-[10px] text-sp-muted whitespace-nowrap">{l.name}</span>
        </div>
      ))}
      {lines.length > 10 && (
        <span className="text-[10px] text-sp-muted/50">+{lines.length - 10} more</span>
      )}
    </div>
  );
}

/**
 * Chart genérico (línea/barras) sobre recharts para visualizar series temporales por creador o plataforma.
 *
 * @kind client
 * @feature admin/_shared
 * @example
 * ```tsx
 * <MetricsChart data={data} lines={[{ key: 'twitch', color: '#9146ff', name: 'Twitch' }]} />
 * ```
 */
export function MetricsChart({ data, lines, height = 380, yAxisLabel }: MetricsChartProps) {
  if (data.length === 0) return <EmptyState />;

  if (data.length === 1) {
    return <SinglePointBarChart data={data} lines={lines} height={height} />;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eceae6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={axisTick}
            stroke="transparent"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={axisTick}
            stroke="transparent"
            tickLine={false}
            axisLine={false}
            width={48}
            {...(yAxisLabel ? { label: { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#a8a39d' } } } : {})}
          />
          <Tooltip
            formatter={(value) => formatCompact(Number(value))}
            labelStyle={labelStyle}
            contentStyle={tooltipStyle}
            cursor={{ stroke: '#e2ddd8', strokeDasharray: '3 3' }}
          />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              name={line.name}
              strokeWidth={2}
              dot={{ r: 2.5, strokeWidth: 0, fill: line.color }}
              activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: line.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend lines={lines} />
    </div>
  );
}
