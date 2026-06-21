'use client';

import type { FinanceDashboardKPIs } from '@/types/financeDashboard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type KPICardProps = {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly highlight?: 'positive' | 'negative' | 'neutral' | 'warning';
};

function KPICard({ label, value, sub, highlight = 'neutral' }: KPICardProps) {
  const valueColor =
    highlight === 'positive'
      ? 'text-emerald-400'
      : highlight === 'negative'
        ? 'text-red-400'
        : highlight === 'warning'
          ? 'text-amber-400'
          : 'text-sp-admin-fg';

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sp-admin-muted">
        {label}
      </span>
      <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
      {sub && <span className="text-[11px] text-sp-admin-muted">{sub}</span>}
    </div>
  );
}

type Props = {
  readonly kpis: FinanceDashboardKPIs;
};

export function FinanceKPIGrid({ kpis }: Props): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      <KPICard
        label="Cobrado real (mes)"
        value={EUR.format(kpis.cobradoRealMes)}
        sub="Base caja — invoice_payments"
        highlight="positive"
      />
      <KPICard
        label="Ingresos facturados"
        value={EUR.format(kpis.incomeTotal)}
        sub="Base devengado"
        highlight="neutral"
      />
      <KPICard
        label="Gastos totales"
        value={EUR.format(kpis.expenseTotal)}
        highlight="negative"
      />
      <KPICard
        label="Beneficio neto"
        value={EUR.format(kpis.beneficioNeto)}
        highlight={kpis.beneficioNeto >= 0 ? 'positive' : 'negative'}
      />
      <KPICard
        label="Pendiente cobro"
        value={EUR.format(kpis.pendingCobro)}
        highlight={kpis.pendingCobro > 0 ? 'warning' : 'neutral'}
      />
      <KPICard
        label="Pendiente pago"
        value={EUR.format(kpis.pendingPago)}
        highlight={kpis.pendingPago > 0 ? 'warning' : 'neutral'}
      />
      <KPICard
        label="Gastos campañas"
        value={EUR.format(kpis.gastosCampana)}
      />
      <KPICard
        label="Gastos empresa"
        value={EUR.format(kpis.gastosEmpresa)}
      />
      <KPICard
        label="Sin conciliar"
        value={String(kpis.unconciliatedMovements)}
        sub="Movimientos bancarios"
        highlight={kpis.unconciliatedMovements > 10 ? 'warning' : 'neutral'}
      />
      <KPICard
        label="Cobros sin aplicar"
        value={String(kpis.pendingApplyPayment)}
        sub="Conciliados, sin factura"
        highlight={kpis.pendingApplyPayment > 0 ? 'warning' : 'neutral'}
      />
    </div>
  );
}
