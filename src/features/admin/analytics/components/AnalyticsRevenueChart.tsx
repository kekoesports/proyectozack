'use client';

import { useMemo } from 'react';
import {
  Area, AreaChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import type { InvoiceWithRelations } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────

type ChartPoint = {
  readonly month:    string;
  readonly label:    string;
  readonly ingresos: number;
  readonly gastos:   number;
  readonly neto:     number;
};

type Props = {
  readonly invoices: readonly InvoiceWithRelations[];
  readonly months?:  number;
};

// ── Formatters ────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const MONTH_FMT = new Intl.DateTimeFormat('es-ES', { month: 'short' });

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return MONTH_FMT.format(new Date(y, m - 1, 1));
}

// ── Component ─────────────────────────────────────────────────────────

export function AnalyticsRevenueChart({ invoices, months = 12 }: Props): React.ReactElement {
  const data = useMemo((): ChartPoint[] => {
    // Construir buckets de los últimos N meses
    const buckets = new Map<string, { ingresos: number; gastos: number }>();
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { ingresos: 0, gastos: 0 });
    }

    // Acumular desde invoices (excluye anuladas ya filtradas)
    for (const inv of invoices) {
      const key = (inv.issueDate ?? '').slice(0, 7);
      const entry = buckets.get(key);
      if (!entry) continue;
      const amount = Number(inv.totalAmount ?? 0);
      if (inv.kind === 'income') entry.ingresos += amount;
      else                        entry.gastos   += amount;
    }

    return [...buckets.entries()].map(([month, d]) => ({
      month,
      label:    monthLabel(month),
      ingresos: Math.round(d.ingresos),
      gastos:   Math.round(d.gastos),
      neto:     Math.round(d.ingresos - d.gastos),
    }));
  }, [invoices, months]);

  const hasData = data.some((d) => d.ingresos > 0 || d.gastos > 0);
  const totalIngresos = data.reduce((s, d) => s + d.ingresos, 0);
  const totalGastos   = data.reduce((s, d) => s + d.gastos, 0);
  const totalNeto     = totalIngresos - totalGastos;

  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-sp-admin-border">
        <div>
          <h3 className="text-[12px] font-bold text-sp-admin-text">Evolución financiera mensual</h3>
          <p className="text-[10px] text-sp-admin-muted mt-0.5">Últimos {months} meses · excluyendo anulados</p>
        </div>
        {hasData && (
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Ingresos</p>
              <p className="text-[13px] font-bold text-emerald-600 tabular-nums">{EUR.format(totalIngresos)}</p>
            </div>
            <div>
              <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Gastos</p>
              <p className="text-[13px] font-bold text-amber-600 tabular-nums">{EUR.format(totalGastos)}</p>
            </div>
            <div>
              <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Neto</p>
              <p className={`text-[13px] font-bold tabular-nums ${totalNeto >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {EUR.format(totalNeto)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"
              className="text-sp-admin-muted/40 mx-auto mb-2" aria-hidden>
              <path d="M4 28V12l8-6 8 6 8-6v16l-8 6-8-6-8 6Z"/>
            </svg>
            <p className="text-[12px] text-sp-admin-muted font-medium">Sin datos financieros para este período</p>
            <p className="text-[10px] text-sp-admin-muted/70 mt-1">Registra movimientos en Facturación para ver la evolución</p>
          </div>
        </div>
      ) : (
        <div className="h-56 px-2 pb-2 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="analytics-ingresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="analytics-gastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="analytics-neto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-sp-admin-border, #e2e2ec)" vertical={false}/>
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--color-sp-admin-muted, #72728a)', fontSize: 10 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => EUR.format(v)}
                tick={{ fill: 'var(--color-sp-admin-muted, #72728a)', fontSize: 10 }}
                axisLine={false} tickLine={false} width={68}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid var(--color-sp-admin-border, #e2e2ec)',
                  borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                formatter={(value, name) => [EUR.format(Number(value)), String(name)]}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                formatter={(value) => value === 'ingresos' ? 'Ingresos' : value === 'gastos' ? 'Gastos' : 'Margen neto'}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#16a34a" fill="url(#analytics-ingresos)" strokeWidth={2}/>
              <Area type="monotone" dataKey="gastos"   stroke="#f59e0b" fill="url(#analytics-gastos)"   strokeWidth={2}/>
              <Area type="monotone" dataKey="neto"     stroke="#3b82f6" fill="url(#analytics-neto)"     strokeWidth={1.5} strokeDasharray="4 2"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
