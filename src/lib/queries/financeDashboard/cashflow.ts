'server-only';

import { and, eq, gte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoicePayments, invoices } from '@/db/schema';
import type { CashflowMonthPoint } from '@/types/financeDashboard';
import { totalEurSql } from '@/lib/finance/money';

function buildMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }
  return months;
}

// Tres series por mes: cobros y pagos en caja (invoice_payments, separados por
// dirección) y gastos en devengo (invoices kind=expense por issue_date).
//
// La dirección de un pago sale de su FK: `issued_invoice_id` siempre es cobro,
// `invoice_id` hereda el `kind` de la factura. Sin separarlas, un pago a un
// talento sumaba al "cobrado" del mes.
export async function getCashflowSeries(
  months = 12,
): Promise<readonly CashflowMonthPoint[]> {
  const series = buildMonths(months);
  const from = `${series[0]}-01`;

  const [cajaRows, pagadoRows] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(${invoicePayments.paymentDate}, 'YYYY-MM')`,
        cobrado: sql<string>`COALESCE(SUM(${invoicePayments.amount}) FILTER (
          WHERE ${invoicePayments.issuedInvoiceId} IS NOT NULL OR ${invoices.kind} = 'income'
        ), 0)::text`,
        pagado: sql<string>`COALESCE(SUM(${invoicePayments.amount}) FILTER (
          WHERE ${invoices.kind} = 'expense'
        ), 0)::text`,
      })
      .from(invoicePayments)
      .leftJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
      .where(gte(invoicePayments.paymentDate, from))
      .groupBy(sql`to_char(${invoicePayments.paymentDate}, 'YYYY-MM')`),

    db
      .select({
        month: sql<string>`to_char(${invoices.issueDate}::date, 'YYYY-MM')`,
        total: sql<string>`COALESCE(SUM(${totalEurSql}), 0)::text`,
      })
      .from(invoices)
      .where(
        and(
          gte(invoices.issueDate, from),
          eq(invoices.kind, 'expense'),
          ne(invoices.status, 'anulada'),
        ),
      )
      .groupBy(sql`to_char(${invoices.issueDate}::date, 'YYYY-MM')`),
  ]);

  const cobradoMap = new Map(cajaRows.map((r) => [r.month, Number(r.cobrado)]));
  const pagadoCajaMap = new Map(cajaRows.map((r) => [r.month, Number(r.pagado)]));
  const devengoMap = new Map(pagadoRows.map((r) => [r.month, Number(r.total)]));

  return series.map((month): CashflowMonthPoint => {
    const cobrado = cobradoMap.get(month) ?? 0;
    const pagadoCaja = pagadoCajaMap.get(month) ?? 0;
    return {
      month,
      cobrado,
      pagadoCaja,
      pagadoDevengo: devengoMap.get(month) ?? 0,
      // Caja contra caja. Restarle el devengo daría un neto que mezcla lo
      // cobrado de verdad con lo que solo está facturado.
      neto: Math.round((cobrado - pagadoCaja) * 100) / 100,
    };
  });
}
