'server-only';

import { getBankReconciliationKpis, listBankTransactions } from '@/lib/queries/bankReconciliation';
import { getCandidatesForTransactions } from '@/lib/queries/bankReconciliationCandidates';
import { getMatchedTransactionsWithPaymentStatus } from '@/lib/queries/bankReconciliationMatched';

export type BankReconciliationSummary = {
  readonly totalTransactions: number;
  readonly importedUnmatched: number;
  readonly matched: number;
  readonly ignored: number;
  readonly needsReview: number;
  readonly matchRate: string;
};

export type UnmatchedTransaction = {
  readonly id: number;
  readonly bookingDate: string;
  readonly amount: number;
  readonly currency: string;
  readonly direction: string;
  readonly description: string;
  readonly counterpartyName: string | null;
};

export type SuggestedMatch = {
  readonly transactionId: number;
  readonly transactionDate: string;
  readonly transactionAmount: number;
  readonly transactionDescription: string;
  readonly topCandidateType: string | null;
  readonly topCandidateName: string | null;
  readonly topCandidateConfidence: number | null;
  readonly topCandidateReason: string | null;
};

export type SuggestedMatchesResult = {
  readonly matches: readonly SuggestedMatch[];
  readonly totalUnmatched: number;
};

export async function getBankReconciliationSummary(): Promise<BankReconciliationSummary> {
  const kpis = await getBankReconciliationKpis();
  const matchRate = kpis.totalTransactions > 0
    ? `${Math.round((kpis.matched / kpis.totalTransactions) * 100)}%`
    : '0%';
  return {
    totalTransactions: kpis.totalTransactions,
    importedUnmatched: kpis.importedUnmatched,
    matched: kpis.matched,
    ignored: kpis.ignored,
    needsReview: kpis.needsReview,
    matchRate,
  };
}

export async function getUnmatchedBankTransactions(): Promise<readonly UnmatchedTransaction[]> {
  const rows = await listBankTransactions({ status: 'imported', limit: 25 });
  return rows.map((tx) => ({
    id: tx.id,
    bookingDate: tx.bookingDate.toISOString().split('T')[0] ?? '',
    amount: Number(tx.amount),
    currency: tx.currency,
    direction: tx.direction,
    description: tx.description.slice(0, 200),
    counterpartyName: tx.counterpartyName,
  }));
}

export type PendingPaymentMatch = {
  readonly transactionId: number;
  readonly bookingDate: string;
  readonly amount: string;
  readonly currency: string;
  readonly direction: string;
  readonly invoiceLabel: string;
  readonly invoiceAmount: string;
  readonly matchConfidence: number;
};

export async function getPendingPaymentMatches(): Promise<readonly PendingPaymentMatch[]> {
  const rows = await getMatchedTransactionsWithPaymentStatus({ limit: 25, offset: 0 });
  return rows
    .filter((r) => !r.paymentApplied && r.matchType !== 'expense')
    .map((r) => ({
      transactionId: r.transactionId,
      bookingDate: r.bookingDate,
      amount: r.amount,
      currency: r.currency,
      direction: r.direction,
      invoiceLabel: r.invoiceLabel,
      invoiceAmount: r.invoiceAmount,
      matchConfidence: r.matchConfidence,
    }));
}

export async function getSuggestedTransactionMatches(): Promise<SuggestedMatchesResult> {
  const rawTxs = await listBankTransactions({ status: 'imported', limit: 25 });
  const txsWithCandidates = await getCandidatesForTransactions(rawTxs);

  const matches = txsWithCandidates.map((tx): SuggestedMatch => {
    const top = tx.candidates[0] ?? null;
    return {
      transactionId: tx.id,
      transactionDate: tx.bookingDate.toISOString().split('T')[0] ?? '',
      transactionAmount: Number(tx.amount),
      transactionDescription: tx.description.slice(0, 200),
      topCandidateType: top?.matchType ?? null,
      topCandidateName: top?.name ?? null,
      topCandidateConfidence: top?.confidence ?? null,
      topCandidateReason: top?.matchReason ?? null,
    };
  });

  return {
    matches,
    totalUnmatched: rawTxs.length,
  };
}
