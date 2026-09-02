'server-only';

import { and, count, eq, isNull, ne, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bankAccounts, bankTransactions, invoicePayments, issuerCompanies } from '@/db/schema';
import { getBankReconciliationKpisExcludingIssuerTaxId } from '@/lib/queries/bankReconciliation';
import { env } from '@/lib/env';
import type { ReconciliationSummary } from '@/types/financeDashboard';

export async function getReconciliationSummary(): Promise<ReconciliationSummary> {
  const [kpis, pendingRow] = await Promise.all([
    getBankReconciliationKpisExcludingIssuerTaxId(env.SLASH_PLAYMAKER_ISSUER_TAX_ID),
    db
      .select({ cnt: count() })
      .from(bankTransactions)
      .leftJoin(invoicePayments, eq(invoicePayments.bankTransactionId, bankTransactions.id))
      .leftJoin(bankAccounts, eq(bankAccounts.id, bankTransactions.bankAccountId))
      .leftJoin(issuerCompanies, eq(issuerCompanies.id, bankAccounts.issuerCompanyId))
      .where(and(
        eq(bankTransactions.status, 'matched'),
        isNull(invoicePayments.id),
        or(isNull(issuerCompanies.taxId), ne(issuerCompanies.taxId, env.SLASH_PLAYMAKER_ISSUER_TAX_ID)),
      )),
  ]);

  return {
    totalTransactions: kpis.totalTransactions,
    importedUnmatched: kpis.importedUnmatched,
    matched: kpis.matched,
    needsReview: kpis.needsReview,
    pendingApplyPayment: Number(pendingRow[0]?.cnt ?? 0),
  };
}
