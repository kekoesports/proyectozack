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
  readonly size?: 'primary' | 'secondary';
};

function KPICard({ label, value, sub, highlight = 'neutral', size = 'secondary' }: KPICardProps): React.ReactElement {
  const valueColor =
    highlight === 'positive' ? 'text-emerald-400'
    : highlight === 'negative' ? 'text-red-400'
    : highlight === 'warning' ? 'text-amber-400'
    : 'text-sp-admin-fg';
  const valueSize = size === 'primary' ? 'text-2xl font-black' : 'text-lg font-bold';
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sp-admin-muted">{label}</span>
      <span className={`${valueSize} ${valueColor} tabular-nums`}>{value}</span>
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
      {/* KPIs primarios */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label="Ingresos devengados"
          value={EUR.format(kpis.incomeTotal)}
          sub="Facturas no anuladas"
          size="primary"
        />
        <KPICard
          label="Costes directos"
          value={EUR.format(kpis.gastosCampanaDirect)}
          sub="Gastos de campaña"
          highlight="negative"
          size="primary"
        />
        <KPICard
          label="Gastos operativos"
          value={EUR.format(kpis.gastosOperativos)}
          sub="Estructura y operaciones"
          highlight="negative"
          size="primary"
        />
        <KPICard
          label="Resultado operativo"
          value={EUR.format(kpis.margenBruto)}
          sub={`${pct(kpis.margenPct)} sobre cobrado`}
          highlight={kpis.margenBruto >= 0 ? 'positive' : 'negative'}
          size="primary"
        />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard
          label="Margen %"
          value={pct(kpis.margenPct)}
          sub="Sobre ingresos cobrados"
          highlight={kpis.margenPct >= 0 ? 'positive' : 'negative'}
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
        <KPICard
          label="Sin clasificar"
          value={kpis.gastosNoClasificados > 0 ? EUR.format(kpis.gastosNoClasificados) : '—'}
          sub={kpis.gastosNoClasificados > 0 ? `${kpis.unclassifiedCount} facturas` : 'Todo clasificado'}
          highlight={kpis.gastosNoClasificados > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {kpis.gastosNoClasificados > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <span className="text-amber-400 font-bold text-sm">{kpis.unclassifiedCount}</span>
          <span className="text-sm text-amber-300">
            {kpis.unclassifiedCount === 1
              ? 'gasto sin grupo asignado'
              : 'gastos sin grupo asignado'}
          </span>
          <Link
            href="/admin/finanzas/gastos"
            className="ml-auto text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300"
          >
            Clasificar
          </Link>
        </div>
      )}

      {/* Caja — datos verificados vía conciliación */}
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sp-admin-muted select-none list-none">
          <svg
            className="h-3 w-3 rotate-0 transition-transform group-open:rotate-90"
            fill="currentColor"
            viewBox="0 0 6 10"
          >
            <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Caja (cash basis)
          <span className="rounded bg-sp-admin-border px-1.5 py-0.5 text-[10px] font-bold text-sp-admin-muted normal-case tracking-normal">
            beta
          </span>
          <span className="text-[10px] font-normal normal-case tracking-normal text-sp-admin-muted">
            pagos verificados vía conciliación bancaria
          </span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      </details>
    </div>
  );
}
