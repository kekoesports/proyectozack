'use client';

import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { GastosBreakdownByGroup, GastosBreakdownBySubtype, GastosMonthlyPoint } from '@/lib/queries/financeDashboard/gastos';

interface Props {
  readonly byGroup: GastosBreakdownByGroup;
  readonly bySubtype: GastosBreakdownBySubtype;
  readonly monthly: readonly GastosMonthlyPoint[];
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const EUR_COMPACT = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: 'compact' });

const GROUP_COLORS: Record<string, string> = {
  campaign_direct: '#e03070',
  operational:     '#5b9bd5',
  sin_clasificar:  '#f59e0b',
};

const SUBTYPE_COLORS = ['#e03070', '#8b3aad', '#5b9bd5', '#16a34a', '#f59e0b', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#059669'];

function formatMonth(m: string): string {
  const parts = m.split('-');
  const mm = parts[1];
  if (!mm) return m;
  const idx = Number(mm) - 1;
  return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][idx] ?? m;
}

/**
 * 3 gráficos de gastos:
 *   1. Donut por grupo (directos / operativos / sin clasificar)
 *   2. Bar horizontal por subtipo (top 8)
 *   3. Bar apilado por mes (evolución)
 */
export function GastosBreakdownCharts({ byGroup, bySubtype, monthly }: Props): React.ReactElement {
  const groupData = byGroup.filter((g) => g.amount > 0);
  const subtypeTop = bySubtype.slice(0, 8);
  const hasMonthly = monthly.some((m) => m.directos + m.operativos + m.sinClasificar > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Donut por grupo */}
      <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
        <h3 className="text-sm font-bold text-sp-admin-fg mb-3">Distribución por grupo</h3>
        {groupData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-xs text-sp-admin-muted italic">
            Sin gastos registrados en el período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[...groupData]} dataKey="amount" nameKey="label" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {groupData.map((g, idx) => <Cell key={idx} fill={GROUP_COLORS[g.group] ?? '#6b7280'} />)}
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

      {/* Bar horizontal por subtipo */}
      <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
        <h3 className="text-sm font-bold text-sp-admin-fg mb-3">Top categorías</h3>
        {subtypeTop.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-xs text-sp-admin-muted italic">
            Sin categorías registradas.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...subtypeTop]} layout="vertical" margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => EUR_COMPACT.format(Number(v))} tick={{ fontSize: 10, fill: '#a8a39d' }} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#a8a39d' }} tickLine={false} width={110} />
              <Tooltip formatter={(value) => [EUR.format(Number(value)), 'Importe']} contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {subtypeTop.map((_, idx) => <Cell key={idx} fill={SUBTYPE_COLORS[idx % SUBTYPE_COLORS.length] ?? '#6b7280'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Evolución mensual — ocupa 2 columnas en lg */}
      <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4 lg:col-span-2">
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
              <Bar dataKey="directos" stackId="a" fill={GROUP_COLORS.campaign_direct} name="Directos" />
              <Bar dataKey="operativos" stackId="a" fill={GROUP_COLORS.operational} name="Operativos" />
              <Bar dataKey="sinClasificar" stackId="a" fill={GROUP_COLORS.sin_clasificar} name="Sin clasificar" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
