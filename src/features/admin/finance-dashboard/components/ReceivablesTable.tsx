'use client';

import type { ReceivableRow } from '@/types/financeDashboard';
import { INVOICE_STATUS_LABELS } from '@/lib/schemas/invoice';
import type { INVOICE_STATUSES } from '@/lib/schemas/invoice';

type InvoiceStatusKey = (typeof INVOICE_STATUSES)[number];

function humanStatus(raw: string): string {
  if (raw in INVOICE_STATUS_LABELS) {
    return INVOICE_STATUS_LABELS[raw as InvoiceStatusKey];
  }
  return raw;
}

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const DATE_FMT = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
});

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return DATE_FMT.format(new Date(y, m - 1, d));
}

type Props = {
  readonly rows: readonly ReceivableRow[];
};

export function ReceivablesTable({ rows }: Props): React.ReactElement {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card px-5 py-8 text-center text-sm text-sp-admin-muted">
        No hay cobros pendientes
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <div className="border-b border-sp-admin-border px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Cobros pendientes
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border">
              {['Nº factura', 'Cliente', 'Total', 'Pagado', 'Pendiente', 'Vencimiento', 'Estado'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.source}-${row.id}`}
                className="border-b border-sp-admin-border/50 last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2 font-mono text-xs text-sp-admin-fg">
                  {row.invoiceNumber}
                  {row.source === 'issued' && (
                    <span className="ml-1 text-[9px] text-sp-admin-muted">EMI</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sp-admin-fg">
                  {row.clientName ?? <span className="text-sp-admin-muted">—</span>}
                </td>
                <td className="px-4 py-2 text-right text-sp-admin-fg">
                  {EUR.format(row.totalAmount)}
                </td>
                <td className="px-4 py-2 text-right text-emerald-400">
                  {row.paidAmount > 0 ? EUR.format(row.paidAmount) : <span className="text-sp-admin-muted">—</span>}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-amber-400">
                  {EUR.format(row.pendingAmount)}
                </td>
                <td className={`px-4 py-2 ${row.isOverdue ? 'text-red-400' : 'text-sp-admin-muted'}`}>
                  {row.isOverdue && <span className="mr-1 text-xs">⚠</span>}
                  {formatDate(row.dueDate)}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full border border-sp-admin-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-sp-admin-muted">
                    {humanStatus(row.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
