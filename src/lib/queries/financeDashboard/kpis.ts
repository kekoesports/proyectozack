'server-only';

import { and, count, eq, gte, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { bankAccounts, bankTransactions, invoicePayments, invoices, issuerCompanies } from '@/db/schema';
import { getBillingKPIs } from '@/lib/queries/invoices';
import { getBankReconciliationKpisExcludingIssuerTaxId } from '@/lib/queries/bankReconciliation';
import { env } from '@/lib/env';
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

  // La dirección de un pago sale de su FK: `issued_invoice_id` siempre es un
  // cobro; `invoice_id` apunta a una factura interna, que puede ser de ingreso
  // o de gasto. Sin este LEFT JOIN, cada pago a un talento engordaba el
  // "cobrado del mes" — y cuanto mejor se conciliara, más mentía la cifra.
  const enMes = and(
    gte(invoicePayments.paymentDate, from),
    lte(invoicePayments.paymentDate, to),
  );

  const [billing, reconciliation, cajaRow, pendingRow] = await Promise.all([
    getBillingKPIs(),
    getBankReconciliationKpisExcludingIssuerTaxId(env.SLASH_PLAYMAKER_ISSUER_TAX_ID),
    db
      .select({
        cobrado: sql<string>`COALESCE(SUM(${invoicePayments.amount}) FILTER (
          WHERE ${invoicePayments.issuedInvoiceId} IS NOT NULL OR ${invoices.kind} = 'income'
        ), 0)::text`,
        pagado: sql<string>`COALESCE(SUM(${invoicePayments.amount}) FILTER (
          WHERE ${invoices.kind} = 'expense'
        ), 0)::text`,
      })
      .from(invoicePayments)
      .leftJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
      .leftJoin(bankTransactions, eq(bankTransactions.id, invoicePayments.bankTransactionId))
      .leftJoin(bankAccounts, eq(bankAccounts.id, bankTransactions.bankAccountId))
      .leftJoin(issuerCompanies, eq(issuerCompanies.id, bankAccounts.issuerCompanyId))
      .where(and(enMes, or(
        isNull(issuerCompanies.taxId),
        ne(issuerCompanies.taxId, env.SLASH_PLAYMAKER_ISSUER_TAX_ID),
      ))),
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

  const cobrado = Number(cajaRow[0]?.cobrado ?? 0);
  const pagado = Number(cajaRow[0]?.pagado ?? 0);

  return {
    incomeTotal: billing.incomeTotal,
    expenseTotal: billing.expenseTotal,
    netTotal: billing.netTotal,
    pendingCobro: billing.pendingCobro,
    pendingPago: billing.pendingPago,
    gastosCampana: billing.gastosCampana,
    gastosEmpresa: billing.gastosEmpresa,
    beneficioNeto: billing.beneficioNeto,
    cobradoRealMes: cobrado,
    pagadoRealMes: pagado,
    netoRealMes: Math.round((cobrado - pagado) * 100) / 100,
    pendingApplyPayment: Number(pendingRow[0]?.cnt ?? 0),
    unconciliatedMovements: reconciliation.importedUnmatched,
  };
}
