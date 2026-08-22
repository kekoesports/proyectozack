'server-only';

/**
 * FV.3 — acceso a datos del IVA y las retenciones del periodo.
 * La lógica de interpretación vive en `tax.shared.ts`.
 */

import { and, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoices, issuedInvoices } from '@/db/schema';
import { NOT_ISSUED_MIRROR } from './revenue';
import type { TaxPeriodSummary } from './tax.shared';

export * from './tax.shared';

/**
 * IVA y retenciones devengados en el periodo.
 *
 * Los importes salen de `vat_amount` / `withholding_amount`, que la migración
 * 0123 derivó de la base y su porcentaje. No se calculan como `total − base`:
 * sobre una nómina esa resta daría el líquido y convertiría el IRPF en un
 * descuento del gasto, que no lo es.
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function getTaxPeriodSummary(period: {
  readonly from: string;
  readonly to: string;
}): Promise<TaxPeriodSummary> {
  const [internas, emitidas] = await Promise.all([
    db
      .select({
        ivaIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'income' AND ${NOT_ISSUED_MIRROR} THEN COALESCE(${invoices.vatAmount}, 0) ELSE 0 END), 0)::text`,
        ivaGastos: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'expense' THEN COALESCE(${invoices.vatAmount}, 0) ELSE 0 END), 0)::text`,
        retenciones: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'expense' THEN COALESCE(${invoices.withholdingAmount}, 0) ELSE 0 END), 0)::text`,
        gastosSinIva: sql<number>`COUNT(*) FILTER (WHERE ${invoices.kind} = 'expense' AND COALESCE(${invoices.vatAmount}, 0) = 0)::int`,
        gastosTotales: sql<number>`COUNT(*) FILTER (WHERE ${invoices.kind} = 'expense')::int`,
      })
      .from(invoices)
      .where(
        and(
          ne(invoices.status, 'anulada'),
          gte(invoices.issueDate, period.from),
          lte(invoices.issueDate, period.to),
        ),
      ),
    db
      .select({
        iva: sql<string>`COALESCE(SUM(${issuedInvoices.vatAmount}), 0)::text`,
      })
      .from(issuedInvoices)
      .where(
        and(
          ne(issuedInvoices.status, 'anulada'),
          gte(issuedInvoices.issueDate, period.from),
          lte(issuedInvoices.issueDate, period.to),
        ),
      ),
  ]);

  const row = internas[0];
  const ivaRepercutido = Number(row?.ivaIngresos ?? 0) + Number(emitidas[0]?.iva ?? 0);
  const ivaSoportado = Number(row?.ivaGastos ?? 0);

  return {
    from: period.from,
    to: period.to,
    ivaRepercutido: Math.round(ivaRepercutido * 100) / 100,
    ivaSoportado: Math.round(ivaSoportado * 100) / 100,
    saldoIva: Math.round((ivaRepercutido - ivaSoportado) * 100) / 100,
    retencionesPracticadas: Math.round(Number(row?.retenciones ?? 0) * 100) / 100,
    gastosSinIva: Number(row?.gastosSinIva ?? 0),
    gastosTotales: Number(row?.gastosTotales ?? 0),
  };
}
