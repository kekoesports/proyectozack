'server-only';

/**
 * FV.1 — Acceso a datos de la definición canónica de ingreso.
 *
 * La lógica vive en `revenue.shared.ts` (pura, testeable sin DB). Aquí solo
 * están las condiciones drizzle y la proyección de ambas tablas a `RevenueRow`,
 * para que P&L, Resumen, KPIs, Ingresos y Rentabilidad consuman exactamente el
 * mismo criterio en lugar de reimplementarlo cada uno.
 */

import { and, eq, gte, isNull, lte, ne, notLike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { billingClients, crmBrands, invoices, issuedInvoices } from '@/db/schema';
import {
  ISSUED_MIRROR_CONCEPT_PREFIX,
  ISSUED_MIRROR_NOTES_PREFIX,
} from '@/lib/utils/invoice-status';
import {
  aggregateRevenue,
  type AggregateRevenueOptions,
  type RevenueRow,
  type RevenueTotals,
} from './revenue.shared';

export * from './revenue.shared';

export type RevenuePeriod = { readonly from: string; readonly to: string };

/**
 * Condición drizzle: la fila interna NO es espejo de una emitida.
 *
 * La FK es el criterio real; los dos `notLike` son el fallback para filas
 * anteriores al backfill de la migración 0130. Cuando FV.7 confirme que no
 * queda ningún espejo sin FK, los prefijos se podrán retirar.
 */
export const NOT_ISSUED_MIRROR: SQL = and(
  isNull(invoices.mirrorOfIssuedInvoiceId),
  or(isNull(invoices.notes), notLike(invoices.notes, `${ISSUED_MIRROR_NOTES_PREFIX}%`)),
  notLike(invoices.concept, `${ISSUED_MIRROR_CONCEPT_PREFIX}%`),
) as SQL;

/**
 * Mismo criterio para queries escritas en SQL crudo (UNION ALL de resumen).
 * Asume que la tabla `invoices` está en el `FROM` sin alias.
 */
export function notIssuedMirrorRawSql(): SQL {
  return sql`(
    invoices.mirror_of_issued_invoice_id IS NULL
    AND (invoices.notes IS NULL OR invoices.notes NOT LIKE ${ISSUED_MIRROR_NOTES_PREFIX + '%'})
    AND invoices.concept NOT LIKE ${ISSUED_MIRROR_CONCEPT_PREFIX + '%'}
  )`;
}

/** Estados de `issued_invoices` que no son facturación devengada. */
const ISSUED_EXCLUDED_STATUS = 'anulada';

/**
 * Todas las filas que componen la facturación de un periodo, ya normalizadas.
 *
 * Devuelve las filas y no solo el total a propósito: el desglose "clic en la
 * cifra → facturas que la componen" se alimenta de aquí, de modo que el total y
 * su detalle no puedan divergir nunca.
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function listRevenueRows(period: RevenuePeriod): Promise<readonly RevenueRow[]> {
  const [issuedRows, internalRows] = await Promise.all([
    db
      .select({
        id: issuedInvoices.id,
        issueDate: issuedInvoices.issueDate,
        status: issuedInvoices.status,
        currency: issuedInvoices.currency,
        totalAmount: issuedInvoices.totalAmount,
        netAmount: issuedInvoices.netAmount,
        clientName: billingClients.name,
        brandName: crmBrands.name,
      })
      .from(issuedInvoices)
      .leftJoin(billingClients, eq(billingClients.id, issuedInvoices.billingClientId))
      .leftJoin(crmBrands, eq(crmBrands.id, issuedInvoices.relatedBrandId))
      .where(
        and(
          ne(issuedInvoices.status, ISSUED_EXCLUDED_STATUS),
          gte(issuedInvoices.issueDate, period.from),
          lte(issuedInvoices.issueDate, period.to),
        ),
      ),
    db
      .select({
        id: invoices.id,
        issueDate: invoices.issueDate,
        status: invoices.status,
        currency: invoices.currency,
        totalAmount: invoices.totalAmount,
        netAmount: invoices.netAmount,
        counterpartyName: invoices.counterpartyName,
        brandName: crmBrands.name,
        mirrorOfIssuedInvoiceId: invoices.mirrorOfIssuedInvoiceId,
        notes: invoices.notes,
        concept: invoices.concept,
      })
      .from(invoices)
      .leftJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
      .where(
        and(
          eq(invoices.kind, 'income'),
          gte(invoices.issueDate, period.from),
          lte(invoices.issueDate, period.to),
        ),
      ),
  ]);

  const issued: RevenueRow[] = issuedRows.map((row) => ({
    source: 'issued',
    id: row.id,
    issueDate: row.issueDate,
    status: row.status,
    currency: row.currency,
    totalAmount: Number(row.totalAmount),
    netAmount: row.netAmount != null ? Number(row.netAmount) : null,
    eurEquivalent: null,
    counterparty: row.clientName ?? row.brandName ?? null,
    mirrorOfIssuedInvoiceId: null,
    notes: null,
    concept: null,
  }));

  const internal: RevenueRow[] = internalRows.map((row) => ({
    source: 'internal',
    id: row.id,
    issueDate: row.issueDate,
    status: row.status,
    currency: row.currency,
    totalAmount: Number(row.totalAmount),
    netAmount: row.netAmount != null ? Number(row.netAmount) : null,
    eurEquivalent: null,
    counterparty: row.counterpartyName ?? row.brandName ?? null,
    mirrorOfIssuedInvoiceId: row.mirrorOfIssuedInvoiceId,
    notes: row.notes,
    concept: row.concept,
  }));

  return [...issued, ...internal];
}

/**
 * Facturación agregada del periodo. Punto de entrada único para cualquier
 * pantalla que enseñe un "facturado".
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function getRevenueTotals(
  period: RevenuePeriod,
  options: AggregateRevenueOptions = {},
): Promise<RevenueTotals> {
  const rows = await listRevenueRows(period);
  return aggregateRevenue(rows, options);
}
