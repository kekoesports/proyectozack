import Link from 'next/link';
import type { ArAgingRow } from '@/types/arAging';
import {
  INVOICE_STATUS_DISPLAY_LABELS,
  INVOICE_STATUS_DISPLAY_SEMANTIC,
  normalizeInvoiceStatusForDisplay,
  type InvoiceStatusDisplay,
} from '@/lib/utils/invoice-status-display';

interface Props {
  readonly rows: readonly ArAgingRow[];
  readonly filteredRowCount: number;
  readonly totalRows: number;
  readonly filters: Filters;
}

interface Filters {
  readonly cliente: string | null;
  readonly marca: string | null;
  readonly estado: InvoiceStatusDisplay | 'todas';
  readonly tipo: 'todas' | 'internal' | 'issued';
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

const SEMANTIC_BADGE: Record<'positive' | 'attention' | 'negative' | 'neutral', string> = {
  positive:  'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
  attention: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
  negative:  'bg-red-500/15 text-red-500 border border-red-500/30',
  neutral:   'bg-slate-500/15 text-slate-400 border border-slate-500/30',
};

function StatusBadge({ status }: { status: InvoiceStatusDisplay }): React.ReactElement {
  const semantic = INVOICE_STATUS_DISPLAY_SEMANTIC[status];
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-block ${SEMANTIC_BADGE[semantic]}`}>
      {INVOICE_STATUS_DISPLAY_LABELS[status]}
    </span>
  );
}

/**
 * Tabla principal de facturas — unifica `invoices` (income) e
 * `issued_invoices` a través del formato común de `ArAgingRow`.
 *
 * Estados normalizados con `normalizeInvoiceStatusForDisplay`. Filtros
 * aplicados en cliente para no rehacer queries. El aging server-side
 * es la fuente de las filas.
 */
export function IngresosTabla({ rows, filteredRowCount, totalRows, filters }: Props): React.ReactElement {
  return (
    <section aria-labelledby="ingresos-tabla-title" className="rounded-2xl border border-sp-border bg-sp-admin-card overflow-hidden">
      <div className="px-4 py-3 border-b border-sp-border flex items-baseline justify-between gap-3">
        <div>
          <h2 id="ingresos-tabla-title" className="text-sm font-bold text-sp-admin-fg">Facturas</h2>
          <p className="text-[11px] text-sp-admin-muted mt-0.5">
            Facturas internas + emitidas oficiales con saldo pendiente. Estados normalizados.
          </p>
        </div>
        <p className="text-[11px] text-sp-admin-muted tabular-nums">
          {filteredRowCount}/{totalRows} filas
        </p>
      </div>

      {filteredRowCount === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-sp-admin-muted italic">
            {totalRows === 0
              ? 'No hay facturas pendientes. Todo al día.'
              : 'Ningún resultado con los filtros actuales.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-border bg-sp-admin-card/60">
                {['Factura', 'Cliente', 'Marca', 'Tipo', 'Emisión', 'Vencimiento', 'Importe', 'Cobrado', 'Pendiente', 'Estado', 'Documento'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = normalizeInvoiceStatusForDisplay(row.status);
                const isMatch = matches(row, status, filters);
                if (!isMatch) return null;
                return (
                  <tr key={`${row.source}-${row.id}`} className="border-b border-sp-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                    <td className="px-3 py-2 text-[12px] font-medium text-sp-admin-fg whitespace-nowrap">
                      {row.invoiceNumber}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-sp-admin-fg max-w-[180px] truncate">
                      {row.clientName ?? row.entity ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-sp-admin-muted max-w-[140px] truncate">
                      {row.brandName ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[10px] whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${
                        row.source === 'issued'
                          ? 'bg-sp-orange/15 text-sp-orange'
                          : 'bg-slate-500/15 text-slate-400'
                      }`}>
                        {row.source === 'issued' ? 'Emitida' : 'Interna'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-sp-admin-muted whitespace-nowrap tabular-nums">
                      {row.issueDate}
                    </td>
                    <td className="px-3 py-2 text-[11px] whitespace-nowrap tabular-nums">
                      <span className={row.daysOverdue > 0 ? 'text-red-400 font-semibold' : 'text-sp-admin-muted'}>
                        {row.effectiveDueDate}
                        {row.isEstimatedDueDate ? <span className="text-[9px] ml-1 opacity-70">(est.)</span> : null}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] font-semibold text-sp-admin-fg tabular-nums text-right whitespace-nowrap">
                      {fmt(row.totalAmount)}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-emerald-500 tabular-nums text-right whitespace-nowrap">
                      {row.paidAmount > 0 ? fmt(row.paidAmount) : '—'}
                    </td>
                    <td className="px-3 py-2 text-[12px] font-bold text-amber-500 tabular-nums text-right whitespace-nowrap">
                      {fmt(row.pendingAmount)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.pdfUrl ? (
                        <Link
                          href={row.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-sp-orange hover:opacity-80"
                        >
                          Abrir →
                        </Link>
                      ) : (
                        <span className="text-[10px] text-sp-admin-muted">Sin PDF</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Aplica los filtros de UI a una fila. Todo en cliente — la fuente es
 * el aging server-side (`getArAging()` sin filtros).
 */
function matches(row: ArAgingRow, statusNormalized: InvoiceStatusDisplay, f: Filters): boolean {
  if (f.tipo !== 'todas' && row.source !== f.tipo) return false;
  if (f.estado !== 'todas' && statusNormalized !== f.estado) return false;
  if (f.cliente) {
    const clientName = row.clientName ?? row.entity ?? '';
    if (clientName.toLowerCase() !== f.cliente.toLowerCase()) return false;
  }
  if (f.marca) {
    const brand = row.brandName ?? '';
    if (brand.toLowerCase() !== f.marca.toLowerCase()) return false;
  }
  return true;
}
