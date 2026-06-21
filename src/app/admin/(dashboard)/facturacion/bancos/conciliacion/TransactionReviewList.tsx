'use client';

import { useActionState } from 'react';
import { approveMatchAction, rejectMatchAction, ignoreTransactionAction } from './actions';
import type { BankTransactionWithCandidates, ScoredCandidate } from '@/types';

type State = { readonly error?: string; readonly success?: boolean };
const init: State = {};

function fmt(n: number | string, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(n));
}

function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function StatusBadge({ status }: { readonly status: string }): React.ReactElement {
  const colors: Record<string, string> = {
    imported: 'bg-amber-100 text-amber-700',
    matched: 'bg-green-100 text-green-700',
    ignored: 'bg-gray-100 text-gray-500',
    needs_review: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    imported: 'Sin conciliar',
    matched: 'Conciliada',
    ignored: 'Ignorada',
    needs_review: 'Revisión',
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function ConfidenceBadge({ score }: { readonly score: number }): React.ReactElement {
  const label = score >= 80 ? 'Alta confianza' : score >= 60 ? 'Media' : 'Baja';
  const colors =
    score >= 80
      ? 'bg-green-100 text-green-700'
      : score >= 60
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors}`}>
      {score}% · {label}
    </span>
  );
}

function matchTypeLabel(t: string): string {
  const labels: Record<string, string> = {
    issued_invoice: 'Factura emitida',
    internal_invoice: 'Factura interna',
    expense: 'Gasto recurrente',
    campaign: 'Campaña',
    client: 'Cliente',
    unknown: 'Desconocido',
  };
  return labels[t] ?? t;
}

function CandidateRow({
  candidate,
  transactionId,
  currency,
}: {
  readonly candidate: ScoredCandidate;
  readonly transactionId: number;
  readonly currency: string;
}): React.ReactElement {
  const [approveState, approveAction, approvePending] = useActionState(approveMatchAction, init);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectMatchAction, init);

  const error = approveState.error ?? rejectState.error;

  return (
    <div className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg bg-sp-admin-bg/60 hover:bg-sp-admin-bg transition-colors">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-sp-admin-muted font-mono">
            {matchTypeLabel(candidate.matchType)}
          </span>
          <ConfidenceBadge score={candidate.confidence} />
        </div>
        <p className="text-xs font-medium truncate">{candidate.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-sp-admin-muted flex-wrap">
          <span className="font-semibold text-sp-admin-fg">{fmt(candidate.amount, currency)}</span>
          <span>·</span>
          <span>{fmtDate(candidate.date)}</span>
          {candidate.reference && (
            <>
              <span>·</span>
              <span className="font-mono">Ref: {candidate.reference}</span>
            </>
          )}
        </div>
        {candidate.matchReason && (
          <p className="text-[10px] text-sp-admin-muted italic">{candidate.matchReason}</p>
        )}
        {error && <p className="text-[10px] text-red-500">{error}</p>}
      </div>
      <div className="flex gap-1 shrink-0 mt-0.5">
        <form action={approveAction}>
          <input type="hidden" name="transactionId" value={transactionId} />
          <input type="hidden" name="matchType" value={candidate.matchType} />
          <input type="hidden" name="matchedEntityId" value={candidate.entityId} />
          <input type="hidden" name="confidence" value={candidate.confidence} />
          <input type="hidden" name="matchReason" value={candidate.matchReason} />
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            title="Aprobar esta conciliación"
            className="px-2 py-1 text-[10px] font-semibold rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            {approvePending ? '…' : '✓'}
          </button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="transactionId" value={transactionId} />
          <input type="hidden" name="matchType" value={candidate.matchType} />
          <input type="hidden" name="matchedEntityId" value={candidate.entityId} />
          <input type="hidden" name="confidence" value={candidate.confidence} />
          <input type="hidden" name="matchReason" value={candidate.matchReason} />
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            title="Rechazar este candidato"
            className="px-2 py-1 text-[10px] font-semibold rounded border border-sp-border text-sp-admin-muted hover:bg-sp-admin-bg/60 disabled:opacity-50 transition-colors"
          >
            {rejectPending ? '…' : '✕'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TransactionRow({
  tx,
}: {
  readonly tx: BankTransactionWithCandidates;
}): React.ReactElement {
  const [ignoreState, ignoreAction, ignorePending] = useActionState(ignoreTransactionAction, init);
  const isPending = tx.status === 'imported' || tx.status === 'needs_review';

  return (
    <div className="border-b border-sp-border last:border-0 px-4 py-3 hover:bg-sp-admin-bg/40 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-sp-admin-muted">{fmtDate(tx.bookingDate)}</span>
            <StatusBadge status={tx.status} />
            <span
              className={`text-xs font-semibold ${tx.direction === 'income' ? 'text-green-600' : 'text-red-600'}`}
            >
              {tx.direction === 'income' ? '+' : '-'}
              {fmt(tx.amount, tx.currency)}
            </span>
          </div>
          <p className="text-sm font-medium mt-0.5 truncate">{tx.description || '(sin concepto)'}</p>
          {tx.counterpartyName && (
            <p className="text-xs text-sp-admin-muted mt-0.5">
              {tx.direction === 'income' ? 'De:' : 'Para:'} {tx.counterpartyName}
            </p>
          )}
          {tx.reference && (
            <p className="text-xs text-sp-admin-muted font-mono">Ref: {tx.reference}</p>
          )}
          {ignoreState.error && (
            <p className="text-xs text-red-500 mt-1">{ignoreState.error}</p>
          )}
        </div>
        {isPending && (
          <form action={ignoreAction} className="shrink-0">
            <input type="hidden" name="transactionId" value={tx.id} />
            <button
              type="submit"
              disabled={ignorePending}
              title="Marcar como ignorada"
              className="px-2 py-1 text-[10px] font-semibold rounded border border-sp-border text-sp-admin-muted hover:bg-sp-admin-bg/60 disabled:opacity-50 transition-colors"
            >
              {ignorePending ? '…' : 'Ignorar'}
            </button>
          </form>
        )}
      </div>

      {/* Candidates */}
      {isPending && tx.candidates.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[10px] font-semibold text-sp-admin-muted uppercase tracking-wide">
            Candidatos sugeridos ({tx.candidates.length})
          </p>
          {tx.candidates.map((c) => (
            <CandidateRow
              key={`${c.matchType}:${c.entityId}`}
              candidate={c}
              transactionId={tx.id}
              currency={tx.currency}
            />
          ))}
        </div>
      )}

      {isPending && tx.candidates.length === 0 && (
        <p className="mt-1.5 text-[10px] text-sp-admin-muted italic">
          Sin candidatos de conciliación en el rango ±30 días.
        </p>
      )}
    </div>
  );
}

type Props = { readonly transactions: readonly BankTransactionWithCandidates[] };

export function TransactionReviewList({ transactions }: Props): React.ReactElement {
  return (
    <div className="rounded-xl border border-sp-border bg-sp-admin-card overflow-hidden">
      <div className="px-4 py-3 border-b border-sp-border">
        <p className="text-xs text-sp-admin-muted">
          {transactions.length} transacciones · Candidatos puntuados automáticamente por importe,
          fecha y nombre
        </p>
      </div>
      <div>
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
}
