import { ExpensesClassifyTable } from '@/features/admin/finance-dashboard/components/ExpensesClassifyTable';
import { suggestExpenseCategorization } from '@/lib/utils/expense-suggestion';
import { EXPENSE_GROUP_LABELS, EXPENSE_SUBTYPE_LABELS } from '@/lib/schemas/invoice';
import type { InvoiceWithRelations } from '@/types/invoice';

interface Props {
  readonly rows: readonly InvoiceWithRelations[];
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

/**
 * Bloque destacado "Gastos sin clasificar" — recomendaciones asistidas
 * + tabla existente `ExpensesClassifyTable` que ya integra
 * `BulkClassifyPanel` + `ExpenseClassifyInline` con las Server Actions
 * gated por `facturacion:write`.
 *
 * Las sugerencias son SOLO informativas; el operador confirma.
 */
export function GastosSinClasificarBloque({ rows }: Props): React.ReactElement {
  if (rows.length === 0) {
    return (
      <section aria-labelledby="sin-clasificar-title" id="sin-clasificar" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>✅</span>
          <h2 id="sin-clasificar-title" className="text-sm font-bold text-emerald-500">
            Todos los gastos del período están clasificados
          </h2>
        </div>
      </section>
    );
  }

  const totalAmount = rows.reduce((s, r) => s + Number(r.totalAmount), 0);

  // Precomputa sugerencias para los primeros 5, solo para el bloque de
  // preview. Las sugerencias completas se pueden mostrar en la tabla
  // integrada, pero el `ExpensesClassifyTable` ya existente no las
  // recibe; se dejan como informativas por ahora.
  const previewRows = rows.slice(0, 5).map((r) => {
    const suggestion = suggestExpenseCategorization({ concept: r.concept, counterpartyName: r.counterpartyName });
    return { row: r, suggestion };
  });

  return (
    <section aria-labelledby="sin-clasificar-title" id="sin-clasificar" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>⚠️</span>
            <h2 id="sin-clasificar-title" className="text-sm font-bold text-amber-500">
              Gastos sin clasificar
            </h2>
          </div>
          <p className="text-xs text-sp-admin-muted mt-1">
            {rows.length} factura{rows.length === 1 ? '' : 's'} · {fmt(totalAmount)} — clasifícalos para que el reparto por categoría sea correcto.
          </p>
        </div>
        <a
          href="#tabla-clasificar"
          className="text-[11px] font-semibold text-sp-orange hover:opacity-80 whitespace-nowrap"
        >
          Ir a clasificar →
        </a>
      </header>

      {previewRows.some((p) => p.suggestion) ? (
        <div className="rounded-lg border border-sp-border/60 bg-sp-admin-card/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-2">
            Sugerencias asistidas · no se aplican automáticamente
          </p>
          <ul className="space-y-2">
            {previewRows.map(({ row, suggestion }) => (
              <li key={row.id} className="flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sp-admin-fg truncate">{row.concept}</p>
                  <p className="text-[11px] text-sp-admin-muted mt-0.5 truncate">
                    {row.counterpartyName ?? '(Sin proveedor)'} · {fmt(Number(row.totalAmount))}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {suggestion ? (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sp-orange">Sugerido</p>
                      <p className="text-[11px] text-sp-admin-fg font-medium">
                        {EXPENSE_GROUP_LABELS[suggestion.expenseGroup]} · {EXPENSE_SUBTYPE_LABELS[suggestion.expenseSubtype]}
                      </p>
                      <p className="text-[10px] text-sp-admin-muted italic">&ldquo;{suggestion.matchedKeyword}&rdquo;</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-sp-admin-muted italic">Sin sugerencia</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {rows.length > 5 ? (
            <p className="text-[10px] text-sp-admin-muted mt-3 italic">
              +{rows.length - 5} sin clasificar adicionales — visibles en la tabla de abajo.
            </p>
          ) : null}
        </div>
      ) : null}

      <div id="tabla-clasificar" className="rounded-lg border border-sp-border/60 bg-sp-admin-card/60 p-3">
        <ExpensesClassifyTable
          invoices={rows}
          title="Clasificar gastos sin categoría"
          showClassify
        />
      </div>
    </section>
  );
}
