import Link from 'next/link';
import { EXPENSE_SUBTYPE_LABELS } from '@/lib/schemas/invoice';
import {
  EXPENSE_STATUS_DISPLAY_LABELS,
  EXPENSE_STATUS_DISPLAY_SEMANTIC,
  normalizeExpenseStatusForDisplay,
} from '@/lib/utils/expense-status-display';
import { buildInvoicePdfUrl } from '@/lib/queries/financeDashboard/expenseSubgroups';
import type { InvoiceWithRelations } from '@/types/invoice';

interface Props {
  readonly rows: readonly InvoiceWithRelations[];
  readonly totalRows: number;
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

const SEMANTIC_BADGE: Record<'positive' | 'attention' | 'negative' | 'neutral', string> = {
  positive:  'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
  attention: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
  negative:  'bg-red-500/15 text-red-500 border border-red-500/30',
  neutral:   'bg-slate-500/15 text-slate-400 border border-slate-500/30',
};

/**
 * Tabla de nóminas internas. Columnas simplificadas — no inventamos
 * campos que no existen (bruto/neto/IRPF/coste empresa no están en el
 * schema como columnas estructuradas; solo hay `totalAmount`).
 */
export function NominasInternasTabla({ rows, totalRows }: Props): React.ReactElement {
  return (
    <section aria-labelledby="nominas-tabla-title" className="rounded-2xl border border-sp-border bg-sp-admin-card overflow-hidden">
      <div className="px-4 py-3 border-b border-sp-border flex items-baseline justify-between gap-3">
        <div>
          <h2 id="nominas-tabla-title" className="text-sm font-bold text-sp-admin-fg">Nóminas internas</h2>
          <p className="text-[11px] text-sp-admin-muted mt-0.5">
            Nóminas socios · SS / autónomos · Estado normalizado visual.
          </p>
        </div>
        <p className="text-[11px] text-sp-admin-muted tabular-nums">
          {rows.length}/{totalRows} filas
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-sp-admin-muted italic">
            {totalRows === 0
              ? 'No hay nóminas registradas en el período.'
              : 'Ningún resultado con los filtros actuales.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-border bg-sp-admin-card/60">
                {['Persona', 'Periodo', 'Concepto', 'Tipo', 'Fecha', 'Importe', 'Estado', 'Doc'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = normalizeExpenseStatusForDisplay(row.status);
                const semantic = EXPENSE_STATUS_DISPLAY_SEMANTIC[status];
                const subtypeLabel = row.expenseSubtype ? EXPENSE_SUBTYPE_LABELS[row.expenseSubtype] : '—';
                const periodo = row.issueDate.slice(0, 7); // YYYY-MM
                const pdfHref = buildInvoicePdfUrl({
                  id: row.id,
                  invoiceFileId: row.invoiceFileId,
                  fileUrl: row.fileUrl,
                });
                return (
                  <tr key={row.id} className="border-b border-sp-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                    <td className="px-3 py-2 text-[12px] text-sp-admin-fg font-medium max-w-[180px] truncate">
                      {row.counterpartyName ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-sp-admin-muted whitespace-nowrap tabular-nums">{periodo}</td>
                    <td className="px-3 py-2 text-[12px] text-sp-admin-muted max-w-[200px] truncate">{row.concept}</td>
                    <td className="px-3 py-2 text-[10px] whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded font-semibold bg-sp-orange/15 text-sp-orange">
                        {subtypeLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-sp-admin-muted whitespace-nowrap tabular-nums">{row.issueDate}</td>
                    <td className="px-3 py-2 text-[12px] font-bold text-sp-admin-fg tabular-nums text-right whitespace-nowrap">
                      {fmt(Number(row.totalAmount))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-block ${SEMANTIC_BADGE[semantic]}`}>
                        {EXPENSE_STATUS_DISPLAY_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {pdfHref ? (
                        <Link href={pdfHref} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-sp-orange hover:opacity-80">
                          Abrir →
                        </Link>
                      ) : (
                        <span className="text-[10px] text-sp-admin-muted">—</span>
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
