'server-only';

import { and, eq, gte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoicePayments, invoices } from '@/db/schema';
import type { CashflowMonthPoint } from '@/types/financeDashboard';

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

// Cobrados: cash receipts via invoice_payments grouped by payment_date
// Pagados: expense invoices accrual grouped by issue_date
// Nota: pagado es base devengado porque apply-payment para gastos no está implementado aún.
export async function getCashflowSeries(
  months = 12,
): Promise<readonly CashflowMonthPoint[]> {
  const series = buildMonths(months);
  const from = `${series[0]}-01`;

  const [cobradoRows, pagadoRows] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(${invoicePayments.paymentDate}, 'YYYY-MM')`,
        total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text`,
      })
      .from(invoicePayments)
      .where(gte(invoicePayments.paymentDate, from))
      .groupBy(sql`to_char(${invoicePayments.paymentDate}, 'YYYY-MM')`),

    db
      .select({
        month: sql<string>`to_char(${invoices.issueDate}::date, 'YYYY-MM')`,
        total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)::text`,
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

  const cobradoMap = new Map(cobradoRows.map((r) => [r.month, Number(r.total)]));
  const pagadoMap = new Map(pagadoRows.map((r) => [r.month, Number(r.total)]));

  return series.map((month): CashflowMonthPoint => {
    const cobrado = cobradoMap.get(month) ?? 0;
    const pagado = pagadoMap.get(month) ?? 0;
    return { month, cobrado, pagado, neto: cobrado - pagado };
  });
}
