'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CashflowMonthPoint } from '@/types/financeDashboard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const MONTH_FMT = new Intl.DateTimeFormat('es-ES', { month: 'short' });

function shortMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m) return yyyyMm;
  return MONTH_FMT.format(new Date(y, m - 1, 1));
}

type Props = {
  readonly data: readonly CashflowMonthPoint[];
};

export function CashflowChart({ data }: Props): React.ReactElement {
  const chartData = data.map((p) => ({
    month: shortMonth(p.month),
    cobrado: Math.round(p.cobrado),
    pagado: Math.round(p.pagado),
    neto: Math.round(p.neto),
  }));

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <div className="flex items-center justify-between border-b border-sp-admin-border px-5 py-3">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
            Cashflow mensual · últimos 12 meses
          </h3>
          <p className="mt-0.5 text-[10px] text-sp-admin-muted/60">
            Cobros reales (base caja) · Gastos facturados (base devengado)
          </p>
        </div>
      </div>
      <div className="h-64 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
            <defs>
              <linearGradient id="cf-cobrado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(34 197 94)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="rgb(34 197 94)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cf-pagado" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(v: number) => EUR.format(v)}
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
                const n = typeof value === 'number' ? value : Number(value ?? 0);
                const label =
                  name === 'cobrado' ? 'Cobrado (cash)' : name === 'pagado' ? 'Gastos (devengado)' : String(name);
                return [EUR.format(n), label];
              }}
            />
            <Area
              type="monotone"
              dataKey="cobrado"
              stroke="rgb(34 197 94)"
              fill="url(#cf-cobrado)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="pagado"
              stroke="rgb(245 158 11)"
              fill="url(#cf-pagado)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
