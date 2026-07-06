'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CashflowMonthPoint } from '@/types/financeDashboard';

interface Props {
  readonly data: readonly CashflowMonthPoint[];
}

const EUR_COMPACT = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: 'compact' });
const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function formatMonth(m: string): string {
  const [_, mm] = m.split('-');
  const idx = Number(mm) - 1;
  return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][idx] ?? m;
}

/**
 * Ingresos (cobrado) vs Gastos (pagado) por mes — 12 meses. Barras
 * dobles. Empty state honesto si no hay datos.
 */
export function IncomeExpenseChart({ data }: Props): React.ReactElement {
  const rows = data.map((d) => ({ mes: formatMonth(d.month), ingresos: d.cobrado, gastos: d.pagado }));
  const hasData = rows.some((r) => r.ingresos > 0 || r.gastos > 0);

  return (
    <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-sp-admin-fg">Ingresos vs gastos por mes</h3>
        <span className="text-[10px] text-sp-admin-muted">Últimos 12 meses</span>
      </div>
      {!hasData ? (
        <div className="h-52 flex items-center justify-center text-xs text-sp-admin-muted italic">
          Sin datos en los últimos 12 meses. Registra facturas o importa un extracto para ver este gráfico.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#a8a39d' }} tickLine={false} />
            <YAxis tickFormatter={(v) => EUR_COMPACT.format(Number(v))} tick={{ fontSize: 10, fill: '#a8a39d' }} tickLine={false} width={54} />
            <Tooltip
              formatter={(value, name) => [EUR.format(Number(value)), name === 'ingresos' ? 'Cobrado' : 'Pagado']}
              labelFormatter={(label) => `Mes ${String(label)}`}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === 'ingresos' ? 'Cobrado' : 'Pagado')} />
            <Bar dataKey="ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
