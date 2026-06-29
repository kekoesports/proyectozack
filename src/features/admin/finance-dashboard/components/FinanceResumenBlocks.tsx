'use client';

import Link from 'next/link';
import type { FinanceResumenKPIs } from '@/lib/queries/financeDashboard/financeResumen';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function sign(n: number): 'positive' | 'negative' | 'neutral' {
  return n > 0 ? 'positive' : n < 0 ? 'negative' : 'neutral';
}

// ── Headline card (top 3) ──────────────────────────────────────────────────

type HeadlineCardProps = {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly accent: 'income' | 'expense' | 'result-pos' | 'result-neg' | 'neutral';
};

function HeadlineCard({ label, value, sub, accent }: HeadlineCardProps): React.ReactElement {
  const border =
    accent === 'income'      ? 'border-emerald-500/40'
    : accent === 'expense'   ? 'border-red-500/30'
    : accent === 'result-pos'? 'border-emerald-500/50'
    : accent === 'result-neg'? 'border-red-500/50'
    :                          'border-sp-admin-border';

  const valueColor =
    accent === 'income'      ? 'text-emerald-400'
    : accent === 'expense'   ? 'text-red-400'
    : accent === 'result-pos'? 'text-emerald-400'
    : accent === 'result-neg'? 'text-red-400'
    :                          'text-sp-admin-fg';

  const dot =
    accent === 'income'      ? 'bg-emerald-500'
    : accent === 'expense'   ? 'bg-red-500'
    : accent === 'result-pos'? 'bg-emerald-500'
    : accent === 'result-neg'? 'bg-red-500'
    :                          'bg-sp-admin-muted';

  return (
    <div className={`flex flex-col gap-2 rounded-xl border ${border} bg-sp-admin-card p-5`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sp-admin-muted">
          {label}
        </span>
      </div>
      <span className={`text-3xl font-black tabular-nums ${valueColor}`}>{value}</span>
      {sub && <span className="text-xs text-sp-admin-muted">{sub}</span>}
    </div>
  );
}

// ── P&L line ──────────────────────────────────────────────────────────────

type PLLineProps = {
  readonly label: string;
  readonly value: number;
  readonly prefix?: string;
  readonly muted?: boolean;
  readonly bold?: boolean;
  readonly separator?: boolean;
};

function PLLine({ label, value, prefix = '', muted, bold, separator }: PLLineProps): React.ReactElement {
  const isNeg = value < 0 || prefix === '−';
  const display = `${prefix}${EUR.format(Math.abs(value))}`;
  return (
    <>
      {separator && <div className="my-2 border-t border-sp-admin-border" />}
      <div
        className={`flex items-baseline justify-between gap-4 ${
          muted ? 'opacity-60' : ''
        } ${bold ? 'font-bold' : ''}`}
      >
        <span className={`text-sm ${bold ? 'text-sp-admin-fg' : 'text-sp-admin-muted'}`}>
          {label}
        </span>
        <span
          className={`tabular-nums text-sm ${
            bold
              ? isNeg
                ? 'text-red-400'
                : 'text-emerald-400'
              : isNeg
                ? 'text-red-400'
                : 'text-sp-admin-fg'
          }`}
        >
          {display}
        </span>
      </div>
    </>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────

type PillProps = {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly variant: 'warning' | 'ok' | 'muted';
};

function StatusPill({ label, value, sub, variant }: PillProps): React.ReactElement {
  const ring =
    variant === 'warning' ? 'border-amber-500/40 bg-amber-500/5'
    : variant === 'ok'    ? 'border-emerald-500/20 bg-emerald-500/5'
    :                       'border-sp-admin-border bg-sp-admin-card';
  const valueColor =
    variant === 'warning' ? 'text-amber-400'
    : variant === 'ok'    ? 'text-emerald-400'
    :                       'text-sp-admin-muted';
  return (
    <div className={`flex flex-col gap-1 rounded-lg border ${ring} px-4 py-3`}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">
        {label}
      </span>
      <span className={`text-base font-bold tabular-nums ${valueColor}`}>{value}</span>
      {sub && <span className="text-[11px] text-sp-admin-muted">{sub}</span>}
    </div>
  );
}

// ── Cash card ────────────────────────────────────────────────────────────

type CashCardProps = {
  readonly label: string;
  readonly value: string;
  readonly color: 'green' | 'red' | 'blue' | 'auto';
  readonly actualValue?: number;
};

function CashCard({ label, value, color, actualValue }: CashCardProps): React.ReactElement {
  const textColor =
    color === 'green' ? 'text-emerald-400'
    : color === 'red' ? 'text-red-400'
    : color === 'blue'? 'text-sky-400'
    : actualValue !== undefined
      ? actualValue >= 0 ? 'text-emerald-400' : 'text-red-400'
      : 'text-sp-admin-fg';
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-sp-admin-border bg-sp-admin-card/50 p-4">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">
        {label}
      </span>
      <span className={`text-xl font-bold tabular-nums ${textColor}`}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

type Props = {
  readonly kpis: FinanceResumenKPIs;
};

export function FinanceResumenBlocks({ kpis }: Props): React.ReactElement {
  const totalGastos = kpis.gastosCampanaDirect + kpis.gastosOperativos;
  const netoCajaMes = kpis.cobradoMes - kpis.pagadoMes;
  const resultAccent = kpis.margenBruto >= 0 ? 'result-pos' : 'result-neg';

  return (
    <div className="space-y-4">

      {/* ── Headline ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <HeadlineCard
          label="Ingresos devengados"
          value={EUR.format(kpis.incomeTotal)}
          sub={`${EUR.format(kpis.incomeSettled)} cobrados`}
          accent="income"
        />
        <HeadlineCard
          label="Total gastos"
          value={EUR.format(totalGastos)}
          sub={`${EUR.format(kpis.gastosCampanaDirect)} campaña · ${EUR.format(kpis.gastosOperativos)} oper.`}
          accent="expense"
        />
        <HeadlineCard
          label="Resultado operativo"
          value={EUR.format(kpis.margenBruto)}
          sub={`Margen ${pct(kpis.margenPct)} sobre cobrado`}
          accent={resultAccent}
        />
      </div>

      {/* ── P&L breakdown ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
          Desglose P&amp;L — devengo
        </p>
        <div className="space-y-1.5">
          <PLLine label="Ingresos totales"       value={kpis.incomeTotal} />
          <PLLine label="└─ Cobrados"            value={kpis.incomeSettled} muted />
          <PLLine label="Costes directos campaña" value={kpis.gastosCampanaDirect} prefix="−" />
          <PLLine label="Gastos operativos"       value={kpis.gastosOperativos}    prefix="−" />
          <PLLine
            label="Resultado bruto"
            value={kpis.margenBruto}
            bold
            separator
            prefix={kpis.margenBruto < 0 ? '−' : ''}
          />
        </div>
        {/* Margen bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 overflow-hidden rounded-full bg-sp-admin-border h-1.5">
            <div
              className={`h-full rounded-full transition-all ${
                kpis.margenPct >= 0 ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(Math.abs(kpis.margenPct), 100)}%` }}
            />
          </div>
          <span className={`text-xs font-bold tabular-nums w-12 text-right ${
            kpis.margenPct >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {pct(kpis.margenPct)}
          </span>
        </div>
      </div>

      {/* ── Estado cobros / alertas ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatusPill
          label="Pendiente de cobro"
          value={kpis.pendienteCobro > 0 ? EUR.format(kpis.pendienteCobro) : '—'}
          sub={kpis.pendienteCobro > 0 ? 'Por cobrar' : 'Al día'}
          variant={kpis.pendienteCobro > 0 ? 'warning' : 'ok'}
        />
        <StatusPill
          label="Pendiente de pago"
          value={kpis.pendientePago > 0 ? EUR.format(kpis.pendientePago) : '—'}
          sub={kpis.pendientePago > 0 ? 'Por pagar' : 'Al día'}
          variant={kpis.pendientePago > 0 ? 'warning' : 'ok'}
        />
        <StatusPill
          label="Sin clasificar"
          value={kpis.gastosNoClasificados > 0 ? EUR.format(kpis.gastosNoClasificados) : 'Limpio'}
          sub={
            kpis.gastosNoClasificados > 0
              ? `${kpis.unclassifiedCount} ${kpis.unclassifiedCount === 1 ? 'factura' : 'facturas'}`
              : 'Todo clasificado'
          }
          variant={kpis.gastosNoClasificados > 0 ? 'warning' : 'ok'}
        />
      </div>

      {kpis.gastosNoClasificados > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5">
          <span className="text-xs text-amber-300">
            {kpis.unclassifiedCount === 1
              ? '1 gasto sin clasificar'
              : `${kpis.unclassifiedCount} gastos sin clasificar`}{' '}
            — afecta al P&L
          </span>
          <Link
            href="/admin/finanzas/gastos"
            className="ml-auto text-xs font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300"
          >
            Clasificar →
          </Link>
        </div>
      )}

      {/* ── Caja (cash) ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
            Caja — mes actual
          </p>
          <span className="rounded bg-sp-admin-border px-1.5 py-0.5 text-[10px] font-bold text-sp-admin-muted">
            beta
          </span>
          <span className="text-[10px] text-sp-admin-muted">
            pagos verificados vía conciliación
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CashCard
            label="Cobrado este mes"
            value={EUR.format(kpis.cobradoMes)}
            color="green"
          />
          <CashCard
            label="Pagado este mes"
            value={EUR.format(kpis.pagadoMes)}
            color="red"
          />
          <CashCard
            label="Neto caja (mes)"
            value={EUR.format(netoCajaMes)}
            color="auto"
            actualValue={netoCajaMes}
          />
          <CashCard
            label="Cobrado YTD"
            value={EUR.format(kpis.cobradoYTD)}
            color="blue"
          />
        </div>
      </div>

    </div>
  );
}
