import Link from 'next/link';
import type { ExpenseSubgroupItem, ExpenseSubgroupKey, ExpenseSubgroupRow } from '@/lib/queries/financeDashboard/expenseSubgroups';

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

const DATE_FMT = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
});

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return DATE_FMT.format(new Date(y, m - 1, d));
}

/**
 * Detecta si el rango corresponde al año en curso (desde 1-ene hasta hoy).
 * Se usa solo para elegir el título: "este año" vs "este periodo".
 */
function isYearToDateRange(from: string, to: string): boolean {
  const now = new Date();
  const y = now.getFullYear();
  const yearStart = `${y}-01-01`;
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today = `${y}-${mm}-${dd}`;
  return from === yearStart && to === today;
}

function barColor(key: ExpenseSubgroupKey): string {
  switch (key) {
    case 'nomina_pablo':
    case 'nomina_alfonso':
    case 'nomina_otros':
      return 'bg-red-500/70';
    case 'cuota_pablo':
    case 'cuota_alfonso':
    case 'cuota_otros':
    case 'seguridad_social':
      return 'bg-orange-500/70';
    case 'pagos_talentos':
    case 'campana_otros':
      return 'bg-red-400/60';
    case 'sin_clasificar':
      return 'bg-amber-500/70';
    default:
      return 'bg-red-500/50';
  }
}

function amountColor(key: ExpenseSubgroupKey): string {
  return key === 'sin_clasificar' ? 'text-amber-400' : 'text-red-400';
}

function facturasLabel(count: number): string {
  return count === 1 ? '1 factura' : `${count} facturas`;
}

const STATUS_HUMAN: Readonly<Record<string, string>> = {
  cobrada:     'Cobrada',
  pagada:      'Pagada',
  emitida:     'Emitida',
  pendiente:   'Pendiente',
  vencida:     'Vencida',
  borrador:    'Borrador',
  no_cobrada:  'Sin cobrar',
  no_pagada:   'Sin pagar',
  no_cobrado:  'Sin cobrar',
  no_pagado:   'Sin pagar',
  anulada:     'Anulada',
  parcial:     'Parcial',
};

function humanStatus(status: string): string {
  return STATUS_HUMAN[status] ?? status;
}

// ── Subcomponente por subgrupo ──────────────────────────────────────────────

type RowProps = {
  readonly row: ExpenseSubgroupRow;
  readonly isFirst: boolean;
};

function SubgroupRow({ row, isFirst }: RowProps): React.ReactElement {
  const pctLabel = `${row.pct.toFixed(0)}%`;
  return (
    <details
      className="group border-b border-sp-admin-border/40 py-3 last:border-0 [&_.chev]:transition-transform [&[open]_.chev]:rotate-90"
      open={isFirst}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-sp-admin-fg">
            <span className="chev text-sp-admin-muted">▸</span>
            {row.label}
            <span className="text-xs text-sp-admin-muted">· {facturasLabel(row.count)}</span>
          </span>
          <span className={`tabular-nums text-sm ${amountColor(row.key)}`}>
            {EUR.format(row.amount)}
            <span className="text-sp-admin-muted"> · {pctLabel}</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-sp-admin-border">
          <div
            className={`h-full rounded-full ${barColor(row.key)}`}
            style={{ width: `${Math.min(row.pct, 100).toFixed(1)}%` }}
          />
        </div>
      </summary>

      {row.key === 'sin_clasificar' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          <span>Estos gastos aún no tienen categoría asignada.</span>
          <Link
            href="/admin/finanzas/gastos#sin-clasificar"
            className="ml-auto font-semibold underline underline-offset-2 hover:text-amber-200"
          >
            Clasificar →
          </Link>
        </div>
      )}

      <ItemsTable items={row.items} highlightUnclassified={row.key === 'sin_clasificar'} />
    </details>
  );
}

// ── Tabla de items ─────────────────────────────────────────────────────────

type ItemsTableProps = {
  readonly items: readonly ExpenseSubgroupItem[];
  readonly highlightUnclassified: boolean;
};

function ItemsTable({ items, highlightUnclassified }: ItemsTableProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <p className="mt-3 text-xs italic text-sp-admin-muted">
        Sin facturas registradas.
      </p>
    );
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-sp-admin-border/40 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
            <th className="py-1.5 pr-3 font-semibold">Fecha</th>
            <th className="py-1.5 pr-3 font-semibold">Concepto</th>
            <th className="py-1.5 pr-3 font-semibold">Contraparte</th>
            <th className="py-1.5 pr-3 text-right font-semibold">Importe</th>
            <th className="py-1.5 pr-3 font-semibold">Estado</th>
            <th className="py-1.5 font-semibold">PDF</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr
              key={it.id}
              className="border-b border-sp-admin-border/20 last:border-0 hover:bg-white/[0.02]"
            >
              <td className="py-1.5 pr-3 whitespace-nowrap text-sp-admin-muted">
                {formatDate(it.issueDate)}
              </td>
              <td className="py-1.5 pr-3 text-sp-admin-fg">
                {it.concept || <span className="text-sp-admin-muted">—</span>}
              </td>
              <td className="py-1.5 pr-3 text-sp-admin-muted">
                {it.counterpartyName ?? '—'}
              </td>
              <td className={`py-1.5 pr-3 whitespace-nowrap text-right tabular-nums ${highlightUnclassified ? 'text-amber-400' : 'text-red-400'}`}>
                {EUR2.format(it.totalAmount)}
              </td>
              <td className="py-1.5 pr-3 whitespace-nowrap text-sp-admin-muted">
                {humanStatus(it.status)}
              </td>
              <td className="py-1.5 whitespace-nowrap">
                {it.pdfUrl ? (
                  <a
                    href={it.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sp-blue underline-offset-2 hover:underline"
                  >
                    Ver PDF
                  </a>
                ) : (
                  <span className="text-sp-admin-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Bloque principal ───────────────────────────────────────────────────────

type Props = {
  readonly rows: readonly ExpenseSubgroupRow[];
  readonly totalExpense: number;
  readonly from: string;
  readonly to: string;
};

/**
 * Desglose visual de gastos por subgrupo humano (Nóminas Pablo, Software / IA,
 * Cuota autónomo Alfonso, …). Cada línea es expandible con `<details>` HTML
 * nativo — sin `'use client'` ni `useState`.
 *
 * @kind server
 * @feature admin/pnl
 * @route /admin/finanzas/pl
 */
export function AnnualExpenseBreakdown({ rows, totalExpense, from, to }: Props): React.ReactElement {
  const title = isYearToDateRange(from, to)
    ? 'Dónde se ha ido el dinero este año'
    : 'Dónde se ha ido el dinero en este periodo';

  if (rows.length === 0 || totalExpense <= 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
          {title}
        </p>
        <p className="py-4 text-center text-sm text-sp-admin-muted">
          No hay gastos registrados en este rango.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
          {title}
        </p>
        <p className="text-xs text-sp-admin-muted">
          Total gastos: <span className="tabular-nums text-sp-admin-fg">{EUR.format(totalExpense)}</span>
        </p>
      </div>
      <p className="mb-2 text-[10px] italic text-sp-admin-muted">
        Haz clic en una categoría para ver los gastos concretos.
      </p>
      <div>
        {rows.map((r, i) => (
          <SubgroupRow key={r.key} row={r} isFirst={i === 0} />
        ))}
      </div>
    </div>
  );
}
