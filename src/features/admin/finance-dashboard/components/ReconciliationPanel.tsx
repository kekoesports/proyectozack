'use client';

import Link from 'next/link';
import type { ReconciliationSummary } from '@/types/financeDashboard';

type Props = {
  readonly data: ReconciliationSummary;
};

type StatRowProps = {
  readonly label: string;
  readonly value: number;
  readonly highlight?: boolean;
  readonly warn?: boolean;
};

function StatRow({ label, value, highlight, warn }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-sp-admin-muted">{label}</span>
      <span
        className={`text-sm font-semibold ${
          warn && value > 0
            ? 'text-amber-400'
            : highlight
              ? 'text-emerald-400'
              : 'text-sp-admin-fg'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function ReconciliationPanel({ data }: Props): React.ReactElement {
  const conciliationRate =
    data.totalTransactions > 0
      ? Math.round((data.matched / data.totalTransactions) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <div className="border-b border-sp-admin-border px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Estado conciliación bancaria
        </h3>
      </div>
      <div className="divide-y divide-sp-admin-border/40 px-5">
        <StatRow label="Total movimientos" value={data.totalTransactions} />
        <StatRow label="Conciliados" value={data.matched} highlight />
        <StatRow label="Sin conciliar" value={data.importedUnmatched} warn />
        <StatRow label="Requieren revisión" value={data.needsReview} warn />
        <StatRow label="Cobros sin aplicar a factura" value={data.pendingApplyPayment} warn />
      </div>
      <div className="flex items-center justify-between border-t border-sp-admin-border px-5 py-3">
        <span className="text-xs text-sp-admin-muted">
          Tasa de conciliación: <strong className="text-sp-admin-fg">{conciliationRate}%</strong>
        </span>
        <Link
          href="/admin/facturacion/bancos/conciliacion"
          className="text-xs text-sp-blue hover:underline"
        >
          Ver conciliación →
        </Link>
      </div>
    </div>
  );
}
