'server-only';

import { and, count, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bankTransactions, invoicePayments } from '@/db/schema';
import { getBankReconciliationKpis } from '@/lib/queries/bankReconciliation';
import type { ReconciliationSummary } from '@/types/financeDashboard';

export async function getReconciliationSummary(): Promise<ReconciliationSummary> {
  const [kpis, pendingRow] = await Promise.all([
    getBankReconciliationKpis(),
    db
      .select({ cnt: count() })
      .from(bankTransactions)
      .leftJoin(invoicePayments, eq(invoicePayments.bankTransactionId, bankTransactions.id))
      .where(and(eq(bankTransactions.status, 'matched'), isNull(invoicePayments.id))),
  ]);

  return {
    totalTransactions: kpis.totalTransactions,
    importedUnmatched: kpis.importedUnmatched,
    matched: kpis.matched,
    needsReview: kpis.needsReview,
    pendingApplyPayment: Number(pendingRow[0]?.cnt ?? 0),
  };
}
