'server-only';

import { count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bankTransactions, invoicePayments } from '@/db/schema';

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
    db.select({ n: count() }).from(bankTransactions),
    db.select({ n: count() }).from(invoicePayments),
  ]);
  return {
    bankTransactionsCount: txRow[0]?.n ?? 0,
    invoicePaymentsCount: payRow[0]?.n ?? 0,
  };
}
