'server-only';

import { and, eq, gte, inArray, isNull, lte, not, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  billingClients,
  invoices,
  issuedInvoices,
  recurringExpenses,
  transactionMatches,
} from '@/db/schema';
import { scoreMatches } from '@/lib/services/bank-reconciliation/matcher';
import type { MatchCandidate } from '@/lib/services/bank-reconciliation/matcher';
import type { BankTransaction, BankTransactionWithCandidates, ScoredCandidate } from '@/types';

const MAX_CANDIDATES = 5;
const DATE_WINDOW_MS = 30 * 86_400_000;

export async function getCandidatesForTransactions(
  transactions: readonly BankTransaction[],
): Promise<readonly BankTransactionWithCandidates[]> {
  if (transactions.length === 0) return [];

  const timestamps = transactions.map((t) => t.bookingDate.getTime());
  const minDate = new Date(Math.min(...timestamps) - DATE_WINDOW_MS).toISOString().substring(0, 10);
  const maxDate = new Date(Math.max(...timestamps) + DATE_WINDOW_MS).toISOString().substring(0, 10);
  const txIds = transactions.map((t) => t.id);

  const [issuedRows, invoiceRows, recurringRows, rejectedRows] = await Promise.all([
    db
      .select({
        id: issuedInvoices.id,
        issueDate: issuedInvoices.issueDate,
        totalAmount: issuedInvoices.totalAmount,
        invoiceNumber: issuedInvoices.invoiceNumber,
        clientName: billingClients.name,
      })
      .from(issuedInvoices)
      .innerJoin(billingClients, eq(issuedInvoices.billingClientId, billingClients.id))
      .where(
        and(
          inArray(issuedInvoices.status, ['emitida', 'vencida', 'parcial']),
          gte(issuedInvoices.issueDate, minDate),
          lte(issuedInvoices.issueDate, maxDate),
        ),
      ),

    db
      .select({
        id: invoices.id,
        kind: invoices.kind,
        issueDate: invoices.issueDate,
        totalAmount: invoices.totalAmount,
        counterpartyName: invoices.counterpartyName,
        concept: invoices.concept,
        number: invoices.number,
      })
      .from(invoices)
      .where(
        and(
          gte(invoices.issueDate, minDate),
          lte(invoices.issueDate, maxDate),
          not(inArray(invoices.status, ['cobrada', 'pagada', 'anulada', 'borrador'])),
        ),
      ),

    db
      .select({
        id: recurringExpenses.id,
        name: recurringExpenses.name,
        counterpartyName: recurringExpenses.counterpartyName,
        amount: recurringExpenses.amount,
        dayOfMonth: recurringExpenses.dayOfMonth,
        startDate: recurringExpenses.startDate,
        endDate: recurringExpenses.endDate,
      })
      .from(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.active, true),
          lte(recurringExpenses.startDate, maxDate),
          or(isNull(recurringExpenses.endDate), gte(recurringExpenses.endDate, minDate)),
        ),
      ),

    db
      .select({
        transactionId: transactionMatches.transactionId,
        matchType: transactionMatches.matchType,
        matchedEntityId: transactionMatches.matchedEntityId,
      })
      .from(transactionMatches)
      .where(
        and(
          inArray(transactionMatches.transactionId, txIds),
          eq(transactionMatches.status, 'rejected'),
        ),
      ),
  ]);

  const rejectedByTxId = new Map<number, Set<string>>();
  for (const r of rejectedRows) {
    if (r.matchedEntityId === null) continue;
    let txSet = rejectedByTxId.get(r.transactionId);
    if (!txSet) {
      txSet = new Set();
      rejectedByTxId.set(r.transactionId, txSet);
    }
    txSet.add(`${r.matchType}:${r.matchedEntityId}`);
  }

  return transactions.map((tx) => {
    const rejectedSet = rejectedByTxId.get(tx.id) ?? new Set<string>();
    const candidates: MatchCandidate[] = [];

    if (tx.direction === 'income') {
      for (const row of issuedRows) {
        if (rejectedSet.has(`issued_invoice:${row.id}`)) continue;
        candidates.push({
          entityId: row.id,
          matchType: 'issued_invoice',
          direction: 'income',
          amount: Number(row.totalAmount),
          date: new Date(row.issueDate),
          name: row.clientName,
          reference: row.invoiceNumber,
        });
      }
    }

    for (const row of invoiceRows) {
      const dir = row.kind === 'income' ? ('income' as const) : ('expense' as const);
      if (dir !== tx.direction) continue;
      if (rejectedSet.has(`internal_invoice:${row.id}`)) continue;
      candidates.push({
        entityId: row.id,
        matchType: 'internal_invoice',
        direction: dir,
        amount: Number(row.totalAmount),
        date: new Date(row.issueDate),
        name: row.counterpartyName ?? row.concept.slice(0, 100),
        reference: row.number,
      });
    }

    if (tx.direction === 'expense') {
      for (const expense of recurringRows) {
        if (rejectedSet.has(`expense:${expense.id}`)) continue;
        const expenseDate = new Date(
          tx.bookingDate.getFullYear(),
          tx.bookingDate.getMonth(),
          expense.dayOfMonth,
        );
        candidates.push({
          entityId: expense.id,
          matchType: 'expense',
          direction: 'expense',
          amount: Number(expense.amount),
          date: expenseDate,
          name: expense.counterpartyName ?? expense.name,
        });
      }
    }

    const topScored = scoreMatches(tx, candidates).slice(0, MAX_CANDIDATES);

    const scored = topScored.map((r): ScoredCandidate => {
      const cand = candidates.find(
        (c) => c.entityId === r.matchedEntityId && c.matchType === r.matchType,
      );
      return {
        entityId: r.matchedEntityId,
        matchType: r.matchType,
        confidence: r.confidence,
        matchReason: r.matchReason,
        amount: cand?.amount ?? 0,
        date: (cand?.date.toISOString().split('T')[0]) ?? '',
        name: cand?.name ?? '',
        reference: cand?.reference ?? null,
      };
    });

    return {
      ...tx,
      candidates: scored,
      rejectedKeys: [...rejectedSet],
    };
  });
}
