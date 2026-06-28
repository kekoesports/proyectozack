'server-only';

import { like, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoices, recurringExpenses } from '@/db/schema';
import type { HistoricalExpenseRow, RecurringExpenseRow, ApplyResult } from '@/lib/finance/setup2026/types';

/** Returns the set of setup2026 txIds that already exist in the invoices table. */
export async function getExistingSetupTxIds(): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ txId: invoices.txId })
    .from(invoices)
    .where(like(invoices.txId, 'setup2026:%'));

  return new Set(rows.map((r) => r.txId).filter((t): t is string => t !== null && t !== undefined));
}

/** Returns the set of recurring template names that already exist (active). */
export async function getExistingRecurringNames(): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ name: recurringExpenses.name })
    .from(recurringExpenses)
    .where(eq(recurringExpenses.active, true));

  return new Set(rows.map((r) => r.name));
}

/**
 * Applies the setup: creates invoices and recurring templates that don't exist yet.
 * Returns counts of created vs skipped.
 */
export async function applySetup2026(
  historicalRows: readonly HistoricalExpenseRow[],
  recurringRows: readonly RecurringExpenseRow[],
  existingTxIds: ReadonlySet<string>,
  existingRecurringNames: ReadonlySet<string>,
): Promise<ApplyResult> {
  const toInsert = historicalRows.filter((r) => r.include && !existingTxIds.has(r.txId));
  const toSkip = historicalRows.filter((r) => r.include && existingTxIds.has(r.txId));

  const recurringToInsert = recurringRows.filter((r) => r.include && !existingRecurringNames.has(r.name));
  const recurringToSkip = recurringRows.filter((r) => r.include && existingRecurringNames.has(r.name));

  if (toInsert.length > 0) {
    await db.insert(invoices).values(
      toInsert.map((row) => ({
        kind: 'expense' as const,
        scope: 'company' as const,
        concept: row.concept,
        counterpartyName: row.counterpartyName,
        expenseGroup: row.expenseGroup,
        expenseSubtype: row.expenseSubtype as (typeof invoices.$inferInsert)['expenseSubtype'],
        netAmount: row.netAmount,
        vatPct: row.vatPct,
        withholdingPct: row.withholdingPct,
        totalAmount: row.totalAmount,
        paidAmount: '0.00',
        currency: 'EUR',
        issueDate: row.issueDate,
        status: 'pagada' as const,
        txId: row.txId,
        notes: row.notes || null,
      })),
    );
  }

  if (recurringToInsert.length > 0) {
    await db.insert(recurringExpenses).values(
      recurringToInsert.map((row) => ({
        name: row.name,
        concept: row.concept,
        counterpartyName: row.counterpartyName,
        expenseGroup: row.expenseGroup,
        expenseSubtype: row.expenseSubtype as (typeof recurringExpenses.$inferInsert)['expenseSubtype'],
        amount: row.amount,
        vatPct: row.vatPct,
        withholdingPct: row.withholdingPct,
        scope: 'company' as const,
        dayOfMonth: row.dayOfMonth,
        startDate: row.startDate,
        active: true,
        notes: row.notes || null,
      })),
    );
  }

  return {
    invoicesCreated: toInsert.length,
    invoicesSkipped: toSkip.length,
    recurringCreated: recurringToInsert.length,
    recurringSkipped: recurringToSkip.length,
  };
}

/** Preview: returns which rows would be created vs. skipped without writing. */
export async function previewSetup2026(
  historicalRows: readonly HistoricalExpenseRow[],
  recurringRows: readonly RecurringExpenseRow[],
): Promise<{ existing: readonly string[]; toCreate: number; recurringToCreate: number }> {
  const existing = await getExistingSetupTxIds();
  const existingRecurring = await getExistingRecurringNames();

  const toCreate = historicalRows.filter((r) => r.include && !existing.has(r.txId)).length;
  const recurringToCreate = recurringRows.filter((r) => r.include && !existingRecurring.has(r.name)).length;

  return {
    existing: historicalRows.filter((r) => existing.has(r.txId)).map((r) => r.txId),
    toCreate,
    recurringToCreate,
  };
}
