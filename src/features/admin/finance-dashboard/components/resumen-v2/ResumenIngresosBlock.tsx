import Link from 'next/link';
import type { FinanzasResumenIngresos } from '@/types/finanzasResumen';
import { SectionCard } from './SectionCard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

type Props = {
  readonly ingresos: FinanzasResumenIngresos;
  /** Periodo activo, para que el desglose abra con los mismos filtros. */
  readonly period?: { readonly from: string; readonly to: string };
};

export function ResumenIngresosBlock({ ingresos, period }: Props): React.ReactElement {
  const desgloseHref = period
    ? `/admin/finanzas/desglose?from=${period.from}&to=${period.to}`
    : '/admin/finanzas/desglose';

  return (
    <SectionCard title="Ingresos" subtitle="Cobrado y facturado en el periodo">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Row label="Cobrados en el año" amount={ingresos.cobrados} accent="income" hint="Entradas reales en caja" />
        <Row label="Pendientes de cobro" amount={ingresos.pendientes} accent={ingresos.pendientes > 0 ? 'warn' : 'neutral'} hint="Facturado − cobrado" />
        <Row
          label="Total facturado"
          amount={ingresos.facturados}
          accent="neutral"
          hint="Ver de dónde sale →"
          href={desgloseHref}
        />
      </dl>
    </SectionCard>
  );
}

// ── Row ────────────────────────────────────────────────────────────────────

type Accent = 'income' | 'expense' | 'warn' | 'neutral';

function Row({ label, amount, accent, hint, href }: {
  readonly label: string;
  readonly amount: number;
  readonly accent: Accent;
  readonly hint?: string;
  /** Cuando se pasa, la cifra abre su desglose. */
  readonly href?: string;
}): React.ReactElement {
  const color =
    accent === 'income'  ? 'text-emerald-400'
    : accent === 'expense' ? 'text-red-400'
    : accent === 'warn'  ? 'text-amber-400'
    :                       'text-sp-admin-fg';

  const inner = (
    <>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
        {label}
      </dt>
      <dd className={`text-2xl font-black tabular-nums ${color}`}>{EUR.format(amount)}</dd>
      {hint && <dd className="text-[10px] text-sp-admin-muted">{hint}</dd>}
    </>
  );

  const base = 'flex flex-col gap-1 rounded-xl border border-sp-admin-border/60 p-3';

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} transition-colors hover:border-sp-admin-border hover:bg-sp-admin-border/10`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}
