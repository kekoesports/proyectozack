'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { RevenueTrendPoint } from '@/lib/queries/invoices';

const EUR_FORMATTER = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  month: 'short',
});

function formatMonth(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const [yearStr, monthStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (Number.isNaN(year) || Number.isNaN(month)) return value;
  return MONTH_FORMATTER.format(new Date(year, month - 1, 1));
}

type Props = {
  readonly trend: readonly RevenueTrendPoint[];
};

/**
 * Chart de tendencia mensual (área sobre recharts) con ingresos, gastos y neto del CRM.
 *
 * @kind client
 * @feature admin/dashboard
 * @route /admin
 */
export function RevenueTrendChart({ trend }: Props): React.ReactElement {
  const data = trend.map((point) => ({
    month: formatMonth(point.month),
    ingresos: Math.round(point.ingresos),
    gastos: Math.round(point.gastos),
    neto: Math.round(point.ingresos - point.gastos),
  }));

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <div className="flex items-center justify-between border-b border-sp-admin-border px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Tendencia ingresos vs gastos · últimos 12 meses
        </h3>
      </div>
      <div className="h-64 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
            <defs>
              <linearGradient id="revenue-trend-ingresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(34 197 94)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="rgb(34 197 94)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revenue-trend-gastos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(245 158 11)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="rgb(245 158 11)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--color-sp-admin-muted, #888)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value: number) => EUR_FORMATTER.format(value)}
              tick={{ fill: 'var(--color-sp-admin-muted, #888)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-sp-admin-card, #111)',
                border: '1px solid var(--color-sp-admin-border, #333)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value, name) => {
                const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                return [EUR_FORMATTER.format(numeric), String(name)];
              }}
            />
            <Area type="monotone" dataKey="ingresos" stroke="rgb(34 197 94)" fill="url(#revenue-trend-ingresos)" strokeWidth={2} />
            <Area type="monotone" dataKey="gastos" stroke="rgb(245 158 11)" fill="url(#revenue-trend-gastos)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
