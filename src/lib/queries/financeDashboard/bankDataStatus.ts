'server-only';

import { count, eq, isNull, ne, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bankAccounts, bankTransactions, invoicePayments, issuerCompanies } from '@/db/schema';
import { env } from '@/lib/env';

/**
 * Estado de los datos bancarios para saber si mostrar el aviso "Sin
 * datos bancarios importados". Regla: si ambos están a 0 → mostrar.
 *
 * Barato — dos `SELECT COUNT(*)` sin filtros.
 */
export async function getBankDataStatus(): Promise<{
  readonly bankTransactionsCount: number;
  readonly invoicePaymentsCount: number;
}> {
  const [txRow, payRow] = await Promise.all([
    db
      .select({ n: count() })
      .from(bankTransactions)
      .leftJoin(bankAccounts, eq(bankAccounts.id, bankTransactions.bankAccountId))
      .leftJoin(issuerCompanies, eq(issuerCompanies.id, bankAccounts.issuerCompanyId))
      .where(or(isNull(issuerCompanies.taxId), ne(issuerCompanies.taxId, env.SLASH_PLAYMAKER_ISSUER_TAX_ID))),
    db
      .select({ n: count() })
      .from(invoicePayments)
      .leftJoin(bankTransactions, eq(bankTransactions.id, invoicePayments.bankTransactionId))
      .leftJoin(bankAccounts, eq(bankAccounts.id, bankTransactions.bankAccountId))
      .leftJoin(issuerCompanies, eq(issuerCompanies.id, bankAccounts.issuerCompanyId))
      .where(or(isNull(issuerCompanies.taxId), ne(issuerCompanies.taxId, env.SLASH_PLAYMAKER_ISSUER_TAX_ID))),
  ]);
  return {
    bankTransactionsCount: txRow[0]?.n ?? 0,
    invoicePaymentsCount: payRow[0]?.n ?? 0,
  };
}
