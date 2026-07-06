'use client';

import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { NominasBreakdownPoint } from '@/lib/queries/financeDashboard/nominasCreadores';

interface Props {
  readonly totals: {
    readonly nominas: number;
    readonly seguridadSocial: number;
    readonly talentos: number;
  };
  readonly monthly: readonly NominasBreakdownPoint[];
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const EUR_COMPACT = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: 'compact' });

const COLORS = { nominas: '#5b9bd5', seguridadSocial: '#8b3aad', talentos: '#e03070' };

function formatMonth(m: string): string {
  const parts = m.split('-');
  const mm = parts[1];
  if (!mm) return m;
  const idx = Number(mm) - 1;
  return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][idx] ?? m;
}

/**
 * 2 gráficos:
 *   1. Donut por tipo (nóminas / SS-autónomos / talentos)
 *   2. Bar apilado por mes
 */
export function NominasBreakdownCharts({ totals, monthly }: Props): React.ReactElement {
  const donutData = [
    { name: 'Nóminas',         value: totals.nominas,         fill: COLORS.nominas },
    { name: 'SS / autónomos',  value: totals.seguridadSocial, fill: COLORS.seguridadSocial },
    { name: 'Talentos',        value: totals.talentos,        fill: COLORS.talentos },
  ].filter((d) => d.value > 0);

  const hasMonthly = monthly.some((m) => m.nominas + m.seguridadSocial + m.talentos > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
        <h3 className="text-sm font-bold text-sp-admin-fg mb-3">Coste por tipo</h3>
        {donutData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-xs text-sp-admin-muted italic">
            Sin datos de coste en el período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {donutData.map((d, idx) => <Cell key={idx} fill={d.fill} />)}
              </Pie>
              <Tooltip
                formatter={(value, name) => [EUR.format(Number(value)), String(name)]}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => String(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
        <h3 className="text-sm font-bold text-sp-admin-fg mb-3">Evolución mensual</h3>
        {!hasMonthly ? (
          <div className="h-52 flex items-center justify-center text-xs text-sp-admin-muted italic">
            Sin datos suficientes para la evolución mensual.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly.map((m) => ({ ...m, mes: formatMonth(m.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#a8a39d' }} tickLine={false} />
              <YAxis tickFormatter={(v) => EUR_COMPACT.format(Number(v))} tick={{ fontSize: 10, fill: '#a8a39d' }} tickLine={false} width={54} />
              <Tooltip formatter={(value, name) => [EUR.format(Number(value)), String(name)]} contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="nominas" stackId="a" fill={COLORS.nominas} name="Nóminas" />
              <Bar dataKey="seguridadSocial" stackId="a" fill={COLORS.seguridadSocial} name="SS / autónomos" />
              <Bar dataKey="talentos" stackId="a" fill={COLORS.talentos} name="Talentos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
