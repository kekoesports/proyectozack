'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buildContextualText, EXPENSE_SUBTYPE_LABELS } from '@/lib/queries/financeDashboard/financeResumen';
import type {
  MonthlyFinanceFlow,
  FinanceStockKPIs,
  MonthlyExpenseBreakdownItem,
  MonthlyDocItem,
} from '@/lib/queries/financeDashboard/financeResumen';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const EUR2 = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

function monthLabel(ym: string): string {
  const parts = ym.split('-');
  const y = parseInt(parts[0] ?? '2026', 10);
  const m = parseInt(parts[1] ?? '01', 10) - 1;
  return new Date(y, m, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function statusLabel(status: string): string {
  const MAP: Record<string, string> = {
    cobrada: 'Cobrada', pagada: 'Pagada', emitida: 'Emitida',
    pendiente: 'Pendiente', vencida: 'Vencida', borrador: 'Borrador',
    no_cobrada: 'Sin cobrar', no_pagada: 'Sin pagar', anulada: 'Anulada',
    parcial: 'Parcial',
  };
  return MAP[status] ?? status;
}

function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  let y = 2025;
  let m = 1;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const value = `${y}-${String(m).padStart(2, '0')}`;
    const label = new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return options.reverse(); // most recent first
}

// ── Sub-components ────────────────────────────────────────────────────────────

type KpiCardProps = {
  readonly label: string;
  readonly value: string;
  readonly accent: 'income' | 'expense' | 'pos' | 'neg' | 'neutral';
};

function KpiCard({ label, value, accent }: KpiCardProps): React.ReactElement {
  const border =
    accent === 'income'  ? 'border-emerald-500/40'
    : accent === 'expense' ? 'border-red-500/30'
    : accent === 'pos'   ? 'border-emerald-500/50'
    : accent === 'neg'   ? 'border-red-500/50'
    :                       'border-sp-admin-border';
  const dot =
    accent === 'income'  ? 'bg-emerald-500'
    : accent === 'expense' ? 'bg-red-500'
    : accent === 'pos'   ? 'bg-emerald-500'
    : accent === 'neg'   ? 'bg-red-500'
    :                       'bg-sp-admin-muted';
  const valueColor =
    accent === 'income'  ? 'text-emerald-400'
    : accent === 'expense' ? 'text-red-400'
    : accent === 'pos'   ? 'text-emerald-400'
    : accent === 'neg'   ? 'text-red-400'
    :                       'text-sp-admin-fg';

  return (
    <div className={`flex flex-col gap-2 rounded-xl border ${border} bg-sp-admin-card p-5`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sp-admin-muted">
          {label}
        </span>
      </div>
      <span className={`text-3xl font-black tabular-nums ${valueColor}`}>{value}</span>
    </div>
  );
}

// ── Month selector ────────────────────────────────────────────────────────────

function MonthSelector({ mes }: { readonly mes: string }): React.ReactElement {
  const router = useRouter();
  const options = generateMonthOptions();

  return (
    <select
      value={mes}
      onChange={(e) => router.push(`/admin/finanzas/resumen?mes=${e.target.value}`)}
      className="rounded-lg border border-sp-admin-border bg-sp-admin-card px-3 py-1.5 text-sm font-medium text-sp-admin-fg focus:outline-none focus:ring-1 focus:ring-sp-orange"
      aria-label="Seleccionar mes"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  readonly mes: string;
  readonly flow: MonthlyFinanceFlow;
  readonly stock: FinanceStockKPIs;
  readonly breakdown: MonthlyExpenseBreakdownItem[];
  readonly docs: MonthlyDocItem[];
};

export function FinanceMonthlyControl({ mes, flow, stock, breakdown, docs }: Props): React.ReactElement {
  const resultAccent = flow.resultado > 0 ? 'pos' : flow.resultado < 0 ? 'neg' : 'neutral';
  const topExpense = breakdown[0] ?? null;
  const topExpenseLabel = topExpense
    ? (topExpense.subtype ? (EXPENSE_SUBTYPE_LABELS[topExpense.subtype] ?? topExpense.label) : topExpense.label)
    : null;
  const contextualText = buildContextualText(flow.incomeTotal, flow.gastosTotal, topExpenseLabel);

  const netoCaja = flow.cobradoMes - flow.pagadoMes;
  const breakdownTotal = breakdown.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-5">

      {/* ── Header row ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MonthSelector mes={mes} />
          <span className="hidden text-sm text-sp-admin-muted sm:block">
            {monthLabel(mes)}
          </span>
        </div>
        <Link
          href="/admin/finanzas/herramientas"
          className="flex items-center gap-1.5 rounded-lg bg-sp-orange px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          data-testid="btn-subir-gasto"
        >
          + Subir gasto / PDF
        </Link>
      </div>

      {/* ── 3 KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Ingresos" value={EUR.format(flow.incomeTotal)} accent="income" />
        <KpiCard label="Gastos"   value={EUR.format(flow.gastosTotal)} accent="expense" />
        <KpiCard label="Resultado del mes" value={EUR.format(flow.resultado)} accent={resultAccent} />
      </div>

      {/* ── Contextual text ──────────────────────────────────────────── */}
      <p className={`rounded-lg px-4 py-3 text-sm font-medium ${
        flow.resultado >= 0
          ? 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
          : 'border border-red-500/20 bg-red-500/5 text-red-300'
      }`}>
        {contextualText}
      </p>

      {/* ── Dónde se ha gastado ──────────────────────────────────────── */}
      {breakdown.length > 0 && (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
            Dónde se ha gastado el dinero
          </p>
          <div className="space-y-3">
            {breakdown.map((item) => {
              const pct = breakdownTotal > 0 ? (item.amount / breakdownTotal) * 100 : 0;
              return (
                <div key={item.subtype ?? 'null'}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-sp-admin-fg">{item.label}</span>
                    <span className="tabular-nums text-sm text-red-400">{EUR.format(item.amount)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-sp-admin-border">
                    <div
                      className="h-full rounded-full bg-red-500/60"
                      style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sin clasificar alert ─────────────────────────────────────── */}
      {stock.gastosNoClasificados > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5">
          <span className="text-xs text-amber-300">
            {stock.unclassifiedCount === 1
              ? '1 gasto sin clasificar'
              : `${stock.unclassifiedCount} gastos sin clasificar`}{' '}
            — {EUR.format(stock.gastosNoClasificados)} pendiente de asignar
          </span>
          <Link
            href="/admin/finanzas/gastos"
            className="ml-auto text-xs font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300"
          >
            Clasificar →
          </Link>
        </div>
      )}

      {/* ── Documentos del mes ──────────────────────────────────────── */}
      {docs.length > 0 && (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
              Documentos del mes
            </p>
            <Link
              href={`/admin/finanzas/gastos`}
              className="text-xs text-sp-admin-muted underline underline-offset-2 hover:text-sp-admin-fg"
            >
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-sp-admin-border/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-sp-admin-fg">{doc.concept}</p>
                  {doc.counterpartyName && (
                    <p className="truncate text-xs text-sp-admin-muted">{doc.counterpartyName}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      doc.kind === 'income' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {doc.kind === 'expense' ? '−' : '+'}{EUR2.format(doc.totalAmount)}
                  </span>
                  <span className="text-xs text-sp-admin-muted">{statusLabel(doc.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pendientes (saldo vivo — stock) ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
          stock.pendienteCobro > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-sp-admin-border bg-sp-admin-card'
        }`}>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">
            Por cobrar (total)
          </span>
          <span className={`text-base font-bold tabular-nums ${
            stock.pendienteCobro > 0 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {stock.pendienteCobro > 0 ? EUR.format(stock.pendienteCobro) : 'Al día'}
          </span>
          {stock.pendienteCobro > 0 && (
            <span className="text-[11px] text-sp-admin-muted">Saldo pendiente de cobro</span>
          )}
        </div>
        <div className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
          stock.pendientePago > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-sp-admin-border bg-sp-admin-card'
        }`}>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">
            Por pagar (total)
          </span>
          <span className={`text-base font-bold tabular-nums ${
            stock.pendientePago > 0 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {stock.pendientePago > 0 ? EUR.format(stock.pendientePago) : 'Al día'}
          </span>
          {stock.pendientePago > 0 && (
            <span className="text-[11px] text-sp-admin-muted">Saldo pendiente de pago</span>
          )}
        </div>
      </div>

      {/* ── Caja del mes (secundaria) ────────────────────────────────── */}
      <details className="group rounded-xl border border-sp-admin-border">
        <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted hover:text-sp-admin-fg">
          Caja del mes — pagos conciliados
          <span className="text-xs font-normal group-open:hidden">▸ mostrar</span>
          <span className="hidden text-xs font-normal group-open:inline">▾ ocultar</span>
        </summary>
        <div className="grid grid-cols-3 gap-3 px-5 pb-5">
          <div className="flex flex-col gap-1 rounded-xl border border-sp-admin-border bg-sp-admin-card/50 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">Cobrado</span>
            <span className="text-xl font-bold tabular-nums text-emerald-400">{EUR.format(flow.cobradoMes)}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-sp-admin-border bg-sp-admin-card/50 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">Pagado</span>
            <span className="text-xl font-bold tabular-nums text-red-400">{EUR.format(flow.pagadoMes)}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-sp-admin-border bg-sp-admin-card/50 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">Neto caja</span>
            <span className={`text-xl font-bold tabular-nums ${netoCaja >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {EUR.format(netoCaja)}
            </span>
          </div>
        </div>
      </details>

    </div>
  );
}
