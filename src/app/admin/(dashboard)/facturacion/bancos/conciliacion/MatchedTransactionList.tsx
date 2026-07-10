'use client';

import { useActionState, useState } from 'react';
import { applyPaymentAction } from './paymentActions';
import {
  computePaymentPreview,
  type PayableInvoiceKind,
} from '@/lib/services/bank-reconciliation/invoicePaymentGuards';
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

const STATUS_LABEL: Record<string, string> = {
  cobrada: 'cobrada',
  pagada: 'pagada',
  parcial: 'parcial',
};

// Traduce el matchType + kind de factura al PayableInvoiceKind del helper.
// Devuelve null si el match no tiene factura vinculable (expense/unknown).
function toPayableKind(row: MatchedTransactionRow): PayableInvoiceKind | null {
  if (row.matchType === 'issued_invoice') return 'issued';
  if (row.matchType === 'internal_invoice') {
    return row.invoiceKind === 'expense' ? 'internal_expense' : 'internal_income';
  }
  return null;
}

function ApplyPaymentPanel({
  row,
  onClose,
}: {
  row: MatchedTransactionRow;
  onClose: () => void;
}): React.ReactElement {
  const [state, formAction, pending] = useActionState(applyPaymentAction, initialState);

  const kind = toPayableKind(row);
  const preview = kind
    ? computePaymentPreview({
        status: row.invoiceStatus,
        totalDue: row.invoiceAmount,
        previouslyPaid: row.invoicePreviouslyPaid,
        amountToApply: row.amount,
        kind,
      })
    : null;

  return (
    <div className="mt-2 rounded-lg border border-sp-border bg-sp-admin-bg p-4 space-y-3">
      <p className="text-sm font-semibold text-sp-admin-fg">Confirmar cobro/pago</p>

      {preview ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-sp-admin-muted">Total factura</dt>
          <dd className="text-sp-admin-fg text-right font-medium">{formatAmount(preview.totalDue, row.currency)}</dd>
          <dt className="text-sp-admin-muted">
            {row.direction === 'income' ? 'Cobrado hasta ahora' : 'Pagado hasta ahora'}
          </dt>
          <dd className="text-sp-admin-fg text-right font-medium">{formatAmount(preview.previouslyPaid, row.currency)}</dd>
          <dt className="text-sp-admin-muted">Pendiente</dt>
          <dd className="text-sp-admin-fg text-right font-medium">{formatAmount(preview.remaining, row.currency)}</dd>
          <dt className="text-sp-admin-muted">Importe a aplicar</dt>
          <dd className="text-sp-admin-fg text-right font-medium">{formatAmount(preview.amountToApply, row.currency)}</dd>
          <dt className="text-sp-admin-muted pt-1 border-t border-sp-border">Resultado estimado</dt>
          <dd className={`text-right pt-1 border-t border-sp-border font-semibold ${preview.wouldOverpay ? 'text-red-400' : preview.estimatedStatus === 'parcial' ? 'text-amber-300' : 'text-green-400'}`}>
            {STATUS_LABEL[preview.estimatedStatus] ?? preview.estimatedStatus}
          </dd>
        </dl>
      ) : (
        <div className="text-xs text-sp-admin-muted space-y-0.5">
          <p>Transacción: <span className="text-sp-admin-fg font-medium">{formatAmount(row.amount, row.currency)}</span></p>
          <p>Factura: <span className="text-sp-admin-fg font-medium">{row.invoiceLabel}</span> ({formatAmount(row.invoiceAmount, row.currency)})</p>
        </div>
      )}

      {preview?.wouldOverpay && (
        <p className="text-xs text-red-400">
          El importe a aplicar supera el pendiente de la factura. Ajusta el importe o rechaza el match.
        </p>
      )}

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
            disabled={pending || (preview?.wouldOverpay ?? false)}
            className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

/**
 * Determina si la factura vinculada al match ya está en un estado
 * terminal que impide aplicar más pagos. Se usa para deshabilitar el
 * botón preventivamente (defense-in-depth con el guard del servidor).
 */
function invoiceBlockedReason(row: MatchedTransactionRow): string | null {
  const status = (row.invoiceStatus ?? '').trim().toLowerCase();
  if (!status) return null;
  if (status === 'anulada') return 'Factura anulada';
  if (row.matchType === 'internal_invoice' && row.invoiceKind === 'expense' && status === 'pagada') {
    return 'Factura ya pagada';
  }
  if (status === 'cobrada') return 'Factura ya cobrada';
  return null;
}

function MatchedRow({ row }: { row: MatchedTransactionRow }): React.ReactElement {
  const [showPanel, setShowPanel] = useState(false);
  const isExpense = row.matchType === 'expense';
  const blockedReason = invoiceBlockedReason(row);

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
          ) : blockedReason ? (
            <span
              title={blockedReason}
              className="inline-flex items-center gap-1 rounded-lg border border-sp-border px-2.5 py-1 text-xs text-sp-admin-muted cursor-not-allowed opacity-60"
            >
              {blockedReason}
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

      {showPanel && !row.paymentApplied && !isExpense && !blockedReason && (
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
