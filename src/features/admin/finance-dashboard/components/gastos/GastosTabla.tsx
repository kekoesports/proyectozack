import Link from 'next/link';
import { EXPENSE_GROUP_LABELS, EXPENSE_SUBTYPE_LABELS } from '@/lib/schemas/invoice';
import {
  EXPENSE_STATUS_DISPLAY_LABELS,
  EXPENSE_STATUS_DISPLAY_SEMANTIC,
  normalizeExpenseStatusForDisplay,
} from '@/lib/utils/expense-status-display';
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
 * Tabla principal de gastos con estado normalizado visual + badge "Sin
 * clasificar" cuando corresponda. Las columnas relacionadas (marca,
 * campaña, talento) vienen del join server-side.
 *
 * Las acciones de clasificación viven en `GastosSinClasificarBloque`
 * arriba (reutiliza `ExpensesClassifyTable` con las actions existentes).
 */
export function GastosTabla({ rows, totalRows }: Props): React.ReactElement {
  return (
    <section aria-labelledby="gastos-tabla-title" className="rounded-2xl border border-sp-border bg-sp-admin-card overflow-hidden">
      <div className="px-4 py-3 border-b border-sp-border flex items-baseline justify-between gap-3">
        <div>
          <h2 id="gastos-tabla-title" className="text-sm font-bold text-sp-admin-fg">Gastos del período</h2>
          <p className="text-[11px] text-sp-admin-muted mt-0.5">Estado normalizado visual — sin cambios en DB.</p>
        </div>
        <p className="text-[11px] text-sp-admin-muted tabular-nums">
          {rows.length}/{totalRows} filas
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-sp-admin-muted italic">
            {totalRows === 0
              ? 'No hay gastos registrados en el período seleccionado.'
              : 'Ningún resultado con los filtros actuales.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-border bg-sp-admin-card/60">
                {['Fecha', 'Concepto', 'Proveedor', 'Marca', 'Campaña', 'Talento', 'Grupo', 'Subtipo', 'Importe', 'Estado', 'Doc'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = normalizeExpenseStatusForDisplay(row.status);
                const semantic = EXPENSE_STATUS_DISPLAY_SEMANTIC[status];
                const isUnclassified = !row.expenseGroup;
                const groupLabel = row.expenseGroup ? EXPENSE_GROUP_LABELS[row.expenseGroup] : null;
                const subtypeLabel = row.expenseSubtype ? EXPENSE_SUBTYPE_LABELS[row.expenseSubtype] : null;
                const pdfHref = row.invoiceFileId ? `/api/admin/facturas/${row.id}/pdf` : (row.fileUrl ?? null);
                return (
                  <tr key={row.id} className="border-b border-sp-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                    <td className="px-3 py-2 text-[11px] text-sp-admin-muted whitespace-nowrap tabular-nums">{row.issueDate}</td>
                    <td className="px-3 py-2 text-[12px] text-sp-admin-fg max-w-[220px] truncate">{row.concept}</td>
                    <td className="px-3 py-2 text-[12px] text-sp-admin-muted max-w-[160px] truncate">{row.counterpartyName ?? '—'}</td>
                    <td className="px-3 py-2 text-[11px] text-sp-admin-muted max-w-[120px] truncate">{row.brandName ?? '—'}</td>
                    <td className="px-3 py-2 text-[11px] text-sp-admin-muted max-w-[120px] truncate">{row.campaignName ?? '—'}</td>
                    <td className="px-3 py-2 text-[11px] text-sp-admin-muted max-w-[120px] truncate">{row.talentName ?? '—'}</td>
                    <td className="px-3 py-2 text-[10px] whitespace-nowrap">
                      {groupLabel ? (
                        <span className="px-1.5 py-0.5 rounded font-semibold bg-sp-orange/15 text-sp-orange">
                          {groupLabel}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-500">
                          Sin clasificar
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-sp-admin-fg max-w-[140px] truncate">{subtypeLabel ?? '—'}</td>
                    <td className="px-3 py-2 text-[12px] font-bold text-sp-admin-fg tabular-nums text-right whitespace-nowrap">
                      {fmt(Number(row.totalAmount))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-block ${SEMANTIC_BADGE[semantic]}`}>
                        {EXPENSE_STATUS_DISPLAY_LABELS[status]}
                      </span>
                      {isUnclassified ? (
                        <span className="ml-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
                          Sin clas.
                        </span>
                      ) : null}
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
