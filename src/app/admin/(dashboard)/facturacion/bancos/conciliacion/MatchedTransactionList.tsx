'use client';

import { useActionState, useState } from 'react';
import { applyPaymentAction } from './paymentActions';
import type { MatchedTransactionRow } from '@/lib/queries/bankReconciliationMatched';

type ActionState = { error?: string; success?: boolean };
const initialState: ActionState = {};

function formatAmount(amount: string, currency: string): string {
  return `${Number(amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function MatchTypeLabel({ type }: { type: string }): React.ReactElement {
  const labels: Record<string, string> = {
    issued_invoice: 'Factura emitida',
    internal_invoice: 'Factura interna',
    expense: 'Gasto recurrente',
  };
  return <span className="text-xs text-sp-admin-muted">{labels[type] ?? type}</span>;
}

function ApplyPaymentPanel({
  row,
  onClose,
}: {
  row: MatchedTransactionRow;
  onClose: () => void;
}): React.ReactElement {
  const [state, formAction, pending] = useActionState(applyPaymentAction, initialState);

  return (
    <div className="mt-2 rounded-lg border border-sp-border bg-sp-admin-bg p-4 space-y-3">
      <p className="text-sm font-semibold text-sp-admin-fg">Confirmar cobro/pago</p>
      <div className="text-xs text-sp-admin-muted space-y-0.5">
        <p>Transacción: <span className="text-sp-admin-fg font-medium">{formatAmount(row.amount, row.currency)}</span></p>
        <p>Factura: <span className="text-sp-admin-fg font-medium">{row.invoiceLabel}</span> ({formatAmount(row.invoiceAmount, row.currency)})</p>
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="bankTransactionId" value={row.transactionId} />
        {row.matchType === 'issued_invoice' && (
          <input type="hidden" name="issuedInvoiceId" value={row.matchedEntityId} />
        )}
        {row.matchType === 'internal_invoice' && (
          <input type="hidden" name="invoiceId" value={row.matchedEntityId} />
        )}
        <input type="hidden" name="amount" value={row.amount} />
        <input type="hidden" name="currency" value={row.currency} />

        <div>
          <label className="text-xs text-sp-admin-muted block mb-1">Fecha de pago</label>
          <input
            type="date"
            name="paymentDate"
            defaultValue={row.bookingDate}
            required
            className="w-full rounded-lg border border-sp-border bg-sp-admin-card px-2.5 py-1.5 text-xs text-sp-admin-fg focus:outline-none focus:ring-1 focus:ring-sp-orange"
          />
        </div>

        <div>
          <label className="text-xs text-sp-admin-muted block mb-1">Notas (opcional)</label>
          <input
            type="text"
            name="notes"
            maxLength={500}
            placeholder="Ej. Pago parcial, referencia..."
            className="w-full rounded-lg border border-sp-border bg-sp-admin-card px-2.5 py-1.5 text-xs text-sp-admin-fg focus:outline-none focus:ring-1 focus:ring-sp-orange"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {pending ? 'Aplicando...' : row.direction === 'income' ? '✓ Aplicar cobro' : '✓ Aplicar pago'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-sp-border text-xs text-sp-admin-muted hover:text-sp-admin-fg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function MatchedRow({ row }: { row: MatchedTransactionRow }): React.ReactElement {
  const [showPanel, setShowPanel] = useState(false);
  const isExpense = row.matchType === 'expense';

  return (
    <div className="rounded-xl border border-sp-border bg-sp-admin-card p-4 space-y-2">
      {/* Cabecera transacción */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sp-admin-fg truncate">{row.description}</p>
          {row.counterpartyName && (
            <p className="text-xs text-sp-admin-muted">{row.counterpartyName}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold ${row.direction === 'income' ? 'text-green-400' : 'text-red-400'}`}>
            {row.direction === 'income' ? '+' : '-'}{formatAmount(row.amount, row.currency)}
          </p>
          <p className="text-xs text-sp-admin-muted">{row.bookingDate}</p>
        </div>
      </div>

      {/* Match info */}
      <div className="flex items-center gap-2 flex-wrap">
        <MatchTypeLabel type={row.matchType} />
        <span className="text-xs text-sp-admin-fg font-medium">{row.invoiceLabel}</span>
        <span className="text-xs text-sp-admin-muted">— {formatAmount(row.invoiceAmount, row.currency)}</span>
        <span className="ml-auto text-xs text-sp-admin-muted">Confianza: {row.matchConfidence}%</span>
      </div>

      {/* Estado del pago */}
      {row.paymentApplied ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-semibold text-green-300">
            ✓ {row.direction === 'income' ? 'Cobro aplicado' : 'Pago aplicado'}
          </span>
          {row.paymentAmount && (
            <span className="text-xs text-sp-admin-muted">{formatAmount(row.paymentAmount, row.currency)}</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {isExpense ? (
            <span
              title="Aplicar pago a gastos recurrentes estará disponible próximamente"
              className="inline-flex items-center gap-1 rounded-lg border border-sp-border px-2.5 py-1 text-xs text-sp-admin-muted cursor-not-allowed opacity-60"
            >
              Aplicar pago — Próximamente
            </span>
          ) : (
            <button
              onClick={() => setShowPanel((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg bg-sp-orange/10 border border-sp-orange/30 px-2.5 py-1 text-xs font-semibold text-sp-orange hover:bg-sp-orange/20 transition-colors"
            >
              {showPanel ? 'Cancelar' : (row.direction === 'income' ? 'Aplicar cobro' : 'Aplicar pago')}
            </button>
          )}
        </div>
      )}

      {showPanel && !row.paymentApplied && !isExpense && (
        <ApplyPaymentPanel row={row} onClose={() => setShowPanel(false)} />
      )}
    </div>
  );
}

export function MatchedTransactionList({
  rows,
}: {
  rows: readonly MatchedTransactionRow[];
}): React.ReactElement {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-sp-border bg-sp-admin-card px-4 py-12 text-center text-sm text-sp-admin-muted">
        No hay transacciones conciliadas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <MatchedRow key={row.transactionId} row={row} />
      ))}
    </div>
  );
}
