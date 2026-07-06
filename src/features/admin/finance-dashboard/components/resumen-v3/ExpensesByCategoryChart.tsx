'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { FinanzasResumenV2 } from '@/types/finanzasResumen';

interface Props {
  readonly resumen: FinanzasResumenV2;
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const COLORS = ['#f59e0b', '#e03070', '#8b3aad', '#5b9bd5', '#16a34a', '#d97706', '#7c3aed'];

/**
 * Gastos por categoría — donut chart con las 5 grandes categorías del
 * resumen v2: costes directos, nóminas, impuestos, operativos, sin
 * clasificar. Empty state honesto.
 */
export function ExpensesByCategoryChart({ resumen }: Props): React.ReactElement {
  const raw = [
    { name: 'Costes directos', value: resumen.costesDirectos.total },
    { name: 'Nóminas',         value: resumen.nominas.total },
    { name: 'Impuestos',       value: resumen.impuestos.total },
    { name: 'Operativos',      value: resumen.operativos.total - resumen.operativos.sinClasificar },
    { name: 'Sin clasificar',  value: resumen.operativos.sinClasificar },
  ].filter((d) => d.value > 0);

  const total = raw.reduce((acc, r) => acc + r.value, 0);

  return (
    <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-sp-admin-fg">Gastos por categoría</h3>
        <span className="text-[10px] text-sp-admin-muted">Período seleccionado</span>
      </div>
      {total === 0 ? (
        <div className="h-52 flex items-center justify-center text-xs text-sp-admin-muted italic">
          Sin gastos registrados en el período seleccionado.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={[...raw]}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
            >
              {raw.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length] ?? '#6b7280'} />)}
            </Pie>
            <Tooltip
              formatter={(value, name) => [EUR.format(Number(value)), String(name)]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(v) => String(v)}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
