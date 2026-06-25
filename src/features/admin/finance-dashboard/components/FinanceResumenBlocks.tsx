'use client';

import Link from 'next/link';
import type { FinanceResumenKPIs } from '@/lib/queries/financeDashboard/financeResumen';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

type KPICardProps = {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly highlight?: 'positive' | 'negative' | 'neutral' | 'warning';
};

function KPICard({ label, value, sub, highlight = 'neutral' }: KPICardProps): React.ReactElement {
  const valueColor =
    highlight === 'positive' ? 'text-emerald-400'
    : highlight === 'negative' ? 'text-red-400'
    : highlight === 'warning' ? 'text-amber-400'
    : 'text-sp-admin-fg';
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sp-admin-muted">{label}</span>
      <span className={`text-xl font-bold ${valueColor}`}>{value}</span>
      {sub && <span className="text-[11px] text-sp-admin-muted">{sub}</span>}
    </div>
  );
}

type Props = {
  readonly kpis: FinanceResumenKPIs;
};

export function FinanceResumenBlocks({ kpis }: Props): React.ReactElement {
  return (
    <div className="space-y-5">
      {/* Bloque A — Devengo */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-sp-admin-muted">
            Bloque A — Devengo (accrual)
          </h2>
          <span className="text-[10px] text-sp-admin-muted">emisión de facturas</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <KPICard
            label="Facturado"
            value={EUR.format(kpis.incomeTotal)}
            sub="Ingresos no anulados"
          />
          <KPICard
            label="Cobrado"
            value={EUR.format(kpis.incomeSettled)}
            sub="Estado cobrada o pagada"
            highlight="positive"
          />
          <KPICard
            label="Costes registrados"
            value={EUR.format(kpis.gastosCampanaDirect)}
            sub="Gastos de campaña directa"
            highlight="negative"
          />
          <KPICard
            label="Gastos registrados"
            value={EUR.format(kpis.gastosOperativos)}
            sub="Estructura y operaciones"
            highlight="negative"
          />
          <KPICard
            label="Margen bruto"
            value={EUR.format(kpis.margenBruto)}
            sub={`${pct(kpis.margenPct)} sobre cobrado`}
            highlight={kpis.margenBruto >= 0 ? 'positive' : 'negative'}
          />
          <KPICard
            label="Pendiente de cobro"
            value={EUR.format(kpis.pendienteCobro)}
            highlight={kpis.pendienteCobro > 0 ? 'warning' : 'neutral'}
          />
          <KPICard
            label="Pendiente de pago"
            value={EUR.format(kpis.pendientePago)}
            highlight={kpis.pendientePago > 0 ? 'warning' : 'neutral'}
          />
          {kpis.gastosNoClasificados > 0 && (
            <KPICard
              label="Sin clasificar"
              value={EUR.format(kpis.gastosNoClasificados)}
              sub={`${kpis.unclassifiedCount} facturas`}
              highlight="warning"
            />
          )}
        </div>
      </section>

      {/* Bloque B — Caja */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-sp-admin-muted">
            Bloque B — Caja (cash basis)
          </h2>
          <span className="text-[10px] text-sp-admin-muted">pagos verificados via conciliación bancaria</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <KPICard
            label="Cobrado este mes"
            value={EUR.format(kpis.cobradoMes)}
            sub="Pagos verificados — ingresos"
            highlight="positive"
          />
          <KPICard
            label="Cobrado año en curso"
            value={EUR.format(kpis.cobradoYTD)}
            sub="Acumulado anual — cobros"
            highlight="positive"
          />
          <KPICard
            label="Pagado este mes"
            value={EUR.format(kpis.pagadoMes)}
            sub="Pagos verificados — gastos"
            highlight="negative"
          />
          <KPICard
            label="Neto caja (mes)"
            value={EUR.format(kpis.cobradoMes - kpis.pagadoMes)}
            highlight={kpis.cobradoMes - kpis.pagadoMes >= 0 ? 'positive' : 'negative'}
          />
        </div>

        {kpis.unclassifiedCount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <span className="text-amber-400 font-bold text-sm">{kpis.unclassifiedCount}</span>
            <span className="text-sm text-amber-300">
              {kpis.unclassifiedCount === 1
                ? 'gasto sin grupo de gasto asignado'
                : 'gastos sin grupo de gasto asignado'}
            </span>
            <Link
              href="/admin/finanzas/costes"
              className="ml-auto text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300"
            >
              Clasificar
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
