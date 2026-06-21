'server-only';

import { and, count, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bankTransactions, invoicePayments } from '@/db/schema';
import { getBillingKPIs } from '@/lib/queries/invoices';
import { getBankReconciliationKpis } from '@/lib/queries/bankReconciliation';
import type { FinanceDashboardKPIs } from '@/types/financeDashboard';

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(last).padStart(2, '0')}`,
  };
}

export async function getFinanceDashboardKPIs(): Promise<FinanceDashboardKPIs> {
  const { from, to } = currentMonthRange();

  const [billing, reconciliation, cobRow, pendingRow] = await Promise.all([
    getBillingKPIs(),
    getBankReconciliationKpis(),
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
      .from(invoicePayments)
      .where(
        and(
          gte(invoicePayments.paymentDate, from),
          lte(invoicePayments.paymentDate, to),
        ),
      ),
    db
      .select({ cnt: count() })
      .from(bankTransactions)
      .leftJoin(invoicePayments, eq(invoicePayments.bankTransactionId, bankTransactions.id))
      .where(and(eq(bankTransactions.status, 'matched'), isNull(invoicePayments.id))),
  ]);

  return {
    incomeTotal: billing.incomeTotal,
    expenseTotal: billing.expenseTotal,
    netTotal: billing.netTotal,
    pendingCobro: billing.pendingCobro,
    pendingPago: billing.pendingPago,
    gastosCampana: billing.gastosCampana,
    gastosEmpresa: billing.gastosEmpresa,
    beneficioNeto: billing.beneficioNeto,
    cobradoRealMes: Number(cobRow[0]?.total ?? 0),
    pendingApplyPayment: Number(pendingRow[0]?.cnt ?? 0),
    unconciliatedMovements: reconciliation.importedUnmatched,
  };
}
