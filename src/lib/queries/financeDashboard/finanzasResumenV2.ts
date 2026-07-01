'server-only';

import { and, eq, gte, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  billingClients,
  crmBrands,
  invoicePayments,
  invoices,
  issuedInvoices,
  talents,
} from '@/db/schema';
import {
  PENDING_EXPENSE_FILTER,
  PENDING_INCOME_FILTER,
} from '@/lib/utils/invoice-status';
import type { InvoiceStatus } from '@/types';
import type {
  FinanzasPeriod,
  FinanzasResumenCostesDirectos,
  FinanzasResumenIngresos,
  FinanzasResumenMargenBruto,
  FinanzasResumenV2,
  PendienteItem,
} from '@/types/finanzasResumen';
import {
  aggregateImpuestos,
  aggregateNominas,
  aggregateOperativos,
  assemblePendientes,
  classifyResumenSection,
  computeResultadoOperativo,
  daysOverdue,
  round2,
  type ExpenseRow,
} from './finanzasResumenV2.shared';

// ── Zona horaria canónica ───────────────────────────────────────────────────

function todayInMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// ── Filtros ────────────────────────────────────────────────────────────────

export type ResumenFilters = {
  readonly from?: string; // 'YYYY-MM-DD'
  readonly to?:   string; // 'YYYY-MM-DD'
};

function resolvePeriod(filters: ResumenFilters): FinanzasPeriod {
  const today = todayInMadrid();
  const year = today.slice(0, 4);
  return {
    from: filters.from ?? `${year}-01-01`,
    to:   filters.to ?? today,
  };
}

// ── Query principal ─────────────────────────────────────────────────────────

/**
 * Resumen económico anual/YTD. Fuente canónica de pagos: `invoice_payments`.
 * No usa `invoices.paidAmount` (deprecated — TD-14).
 *
 * @cache none
 * @visibility admin
 */
export async function getFinanzasResumenV2(
  filters: ResumenFilters = {},
): Promise<FinanzasResumenV2> {
  const period = resolvePeriod(filters);
  const today = todayInMadrid();

  const [
    ingresosCobradosRows,
    ingresosFacturadosRows,
    expenseRowsPeriod,
    costesDirectosPagadosRows,
    receivablesIssuedRows,
    receivablesInternalRows,
    payablesRows,
  ] = await Promise.all([
    // 1. Ingresos cobrados = SUM(invoice_payments.amount) para income (issued O internal) con paymentDate ∈ periodo
    db
      .select({ amount: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
      .from(invoicePayments)
      .where(
        and(
          gte(invoicePayments.paymentDate, period.from),
          lte(invoicePayments.paymentDate, period.to),
          or(
            sql`${invoicePayments.issuedInvoiceId} IS NOT NULL`,
            sql`${invoicePayments.invoiceId} IN (SELECT id FROM invoices WHERE kind = 'income')`,
          ),
        ),
      ),

    // 2. Ingresos facturados = SUM(totalAmount) income no-anulada con issueDate ∈ periodo
    db
      .select({ amount: sql<string>`COALESCE(SUM(t), 0)::text` })
      .from(
        sql`(
          SELECT total_amount AS t FROM issued_invoices
            WHERE status != 'anulada'
              AND issue_date BETWEEN ${period.from} AND ${period.to}
          UNION ALL
          SELECT total_amount AS t FROM invoices
            WHERE kind = 'income' AND status != 'anulada'
              AND issue_date BETWEEN ${period.from} AND ${period.to}
        ) src`,
      ),

    // 3. Expenses del periodo con detalle — usado para clasificación completa
    db
      .select({
        id: invoices.id,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        expenseGroup: invoices.expenseGroup,
        expenseSubtype: invoices.expenseSubtype,
        concept: invoices.concept,
        counterpartyName: invoices.counterpartyName,
        campaignId: invoices.campaignId,
        talentId: invoices.talentId,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.kind, 'expense'),
          ne(invoices.status, 'anulada'),
          gte(invoices.issueDate, period.from),
          lte(invoices.issueDate, period.to),
        ),
      ),

    // 4. Costes directos pagados = SUM(invoice_payments.amount) para invoices campaign_direct con paymentDate ∈ periodo
    db
      .select({ amount: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
      .where(
        and(
          gte(invoicePayments.paymentDate, period.from),
          lte(invoicePayments.paymentDate, period.to),
          eq(invoices.kind, 'expense'),
          eq(invoices.expenseGroup, 'campaign_direct'),
        ),
      ),

    // 5. Pendientes de cobro — issued
    db
      .select({
        id: issuedInvoices.id,
        invoiceNumber: issuedInvoices.invoiceNumber,
        totalAmount: issuedInvoices.totalAmount,
        paidAmount: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text`,
        dueDate: issuedInvoices.dueDate,
        brandName: crmBrands.name,
        clientName: billingClients.name,
      })
      .from(issuedInvoices)
      .leftJoin(crmBrands,       eq(crmBrands.id, issuedInvoices.relatedBrandId))
      .leftJoin(billingClients,  eq(billingClients.id, issuedInvoices.billingClientId))
      .leftJoin(invoicePayments, eq(invoicePayments.issuedInvoiceId, issuedInvoices.id))
      .where(inArray(issuedInvoices.status, ['emitida', 'vencida', 'parcial']))
      .groupBy(
        issuedInvoices.id, issuedInvoices.invoiceNumber, issuedInvoices.totalAmount,
        issuedInvoices.dueDate, crmBrands.name, billingClients.name,
      ),

    // 6. Pendientes de cobro — internal (kind=income)
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        totalAmount: invoices.totalAmount,
        paidAmount: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text`,
        dueDate: invoices.dueDate,
        brandName: crmBrands.name,
        counterpartyName: invoices.counterpartyName,
      })
      .from(invoices)
      .leftJoin(crmBrands,       eq(crmBrands.id, invoices.brandId))
      .leftJoin(invoicePayments, eq(invoicePayments.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.kind, 'income'),
          inArray(invoices.status, PENDING_INCOME_FILTER as InvoiceStatus[]),
        ),
      )
      .groupBy(
        invoices.id, invoices.number, invoices.totalAmount, invoices.dueDate,
        crmBrands.name, invoices.counterpartyName,
      ),

    // 7. Pendientes de pago (expense) — todos, luego split talent/operativo en memoria
    db
      .select({
        id: invoices.id,
        totalAmount: invoices.totalAmount,
        paidAmount: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text`,
        dueDate: invoices.dueDate,
        concept: invoices.concept,
        counterpartyName: invoices.counterpartyName,
        expenseGroup: invoices.expenseGroup,
        expenseSubtype: invoices.expenseSubtype,
        talentId: invoices.talentId,
        campaignId: invoices.campaignId,
        talentName: talents.name,
      })
      .from(invoices)
      .leftJoin(talents,         eq(talents.id, invoices.talentId))
      .leftJoin(invoicePayments, eq(invoicePayments.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.kind, 'expense'),
          inArray(invoices.status, PENDING_EXPENSE_FILTER as InvoiceStatus[]),
        ),
      )
      .groupBy(
        invoices.id, invoices.totalAmount, invoices.dueDate, invoices.concept,
        invoices.counterpartyName, invoices.expenseGroup, invoices.expenseSubtype,
        invoices.talentId, invoices.campaignId, talents.name,
      ),
  ]);

  // ── Ingresos ─────────────────────────────────────────────────────────────
  const cobrados   = Number(ingresosCobradosRows[0]?.amount ?? '0');
  const facturados = Number(ingresosFacturadosRows[0]?.amount ?? '0');
  const pendientesIngreso = Math.max(0, facturados - cobrados);

  const ingresos: FinanzasResumenIngresos = {
    cobrados:   round2(cobrados),
    facturados: round2(facturados),
    pendientes: round2(pendientesIngreso),
  };

  // ── Expenses en memoria ─────────────────────────────────────────────────
  const expenseRows: ExpenseRow[] = expenseRowsPeriod.map((r) => ({
    totalAmount:      Number(r.totalAmount),
    expenseGroup:     r.expenseGroup,
    expenseSubtype:   r.expenseSubtype,
    concept:          r.concept,
    counterpartyName: r.counterpartyName,
  }));

  const nominas     = aggregateNominas(expenseRows);
  const impuestos   = aggregateImpuestos(expenseRows);
  const operativos  = aggregateOperativos(expenseRows);

  // ── Costes directos (accrual base periodo) ──────────────────────────────
  let costesDirectosPagoTalentoAccrual = 0;
  let costesDirectosProduccionAccrual  = 0;
  for (const r of expenseRowsPeriod) {
    if (classifyResumenSection({ expenseGroup: r.expenseGroup, expenseSubtype: r.expenseSubtype }) !== 'costes_directos') continue;
    if (r.expenseSubtype === 'pago_talento') {
      costesDirectosPagoTalentoAccrual += Number(r.totalAmount);
    } else {
      costesDirectosProduccionAccrual += Number(r.totalAmount);
    }
  }
  const costesDirectosAccrualTotal = costesDirectosPagoTalentoAccrual + costesDirectosProduccionAccrual;

  const costesDirectosPagadosCash = Number(costesDirectosPagadosRows[0]?.amount ?? '0');
  // Split cash → talento / producción proporcionalmente al accrual del periodo.
  const shareTalento    = costesDirectosAccrualTotal > 0 ? costesDirectosPagoTalentoAccrual / costesDirectosAccrualTotal : 0;
  const shareProduccion = costesDirectosAccrualTotal > 0 ? costesDirectosProduccionAccrual  / costesDirectosAccrualTotal : 0;
  const costesDirectosPagosTalentoCash    = costesDirectosPagadosCash * shareTalento;
  const costesDirectosProduccionCash      = costesDirectosPagadosCash * shareProduccion;

  const costesDirectosPagosTalentoPendiente = Math.max(0, costesDirectosPagoTalentoAccrual - costesDirectosPagosTalentoCash);
  const costesDirectosProduccionPendiente   = Math.max(0, costesDirectosProduccionAccrual  - costesDirectosProduccionCash);

  const costesDirectos: FinanzasResumenCostesDirectos = {
    pagados:    round2(costesDirectosPagadosCash),
    pendientes: round2(costesDirectosPagosTalentoPendiente + costesDirectosProduccionPendiente),
    total:      round2(costesDirectosPagadosCash + costesDirectosPagosTalentoPendiente + costesDirectosProduccionPendiente),
    pagosTalento: {
      pagados:    round2(costesDirectosPagosTalentoCash),
      pendientes: round2(costesDirectosPagosTalentoPendiente),
    },
    costesProduccion: {
      pagados:    round2(costesDirectosProduccionCash),
      pendientes: round2(costesDirectosProduccionPendiente),
    },
  };

  // ── Margen bruto ─────────────────────────────────────────────────────────
  const margenBruto: FinanzasResumenMargenBruto = {
    cobrado:   round2(ingresos.cobrados   - costesDirectos.pagados),
    pendiente: round2(ingresos.pendientes - costesDirectos.pendientes),
  };

  // ── Resultado operativo (caja base) ─────────────────────────────────────
  const resultado = computeResultadoOperativo({
    margenBrutoCobrado: margenBruto.cobrado,
    nominasTotal:       nominas.total,
    impuestosTotal:     impuestos.total,
    operativosTotal:    operativos.total,
  });

  // ── Pendientes destacados ──────────────────────────────────────────────
  const cobrosCampanasItems: PendienteItem[] = [];
  for (const r of receivablesIssuedRows) {
    const pending = Math.max(0, Number(r.totalAmount) - Number(r.paidAmount));
    if (pending < 0.01) continue;
    const label = r.brandName ?? r.clientName ?? r.invoiceNumber ?? `#${r.id}`;
    cobrosCampanasItems.push({
      id: r.id,
      source: 'issued',
      label,
      amount: round2(pending),
      dueDate: r.dueDate ?? null,
      daysOverdue: daysOverdue(today, r.dueDate ?? null),
    });
  }
  for (const r of receivablesInternalRows) {
    const pending = Math.max(0, Number(r.totalAmount) - Number(r.paidAmount));
    if (pending < 0.01) continue;
    const label = r.brandName ?? r.counterpartyName ?? r.number ?? `#${r.id}`;
    cobrosCampanasItems.push({
      id: r.id,
      source: 'internal',
      label,
      amount: round2(pending),
      dueDate: r.dueDate ?? null,
      daysOverdue: daysOverdue(today, r.dueDate ?? null),
    });
  }

  const pagosTalentoItems: PendienteItem[] = [];
  const pagosOperativoItems: PendienteItem[] = [];
  for (const r of payablesRows) {
    const pending = Math.max(0, Number(r.totalAmount) - Number(r.paidAmount));
    if (pending < 0.01) continue;
    const item: PendienteItem = {
      id: r.id,
      source: 'internal',
      label: r.expenseSubtype === 'pago_talento'
        ? (r.talentName ?? r.concept ?? `#${r.id}`)
        : (r.counterpartyName ?? r.concept ?? `#${r.id}`),
      amount: round2(pending),
      dueDate: r.dueDate ?? null,
      daysOverdue: daysOverdue(today, r.dueDate ?? null),
    };
    if (r.expenseSubtype === 'pago_talento' || r.expenseGroup === 'campaign_direct') {
      pagosTalentoItems.push(item);
    } else {
      pagosOperativoItems.push(item);
    }
  }

  const pendientes = assemblePendientes({
    cobrosCampanas: cobrosCampanasItems,
    pagosTalento:   pagosTalentoItems,
    pagosOperativo: pagosOperativoItems,
  });

  return {
    period,
    ingresos,
    costesDirectos,
    margenBruto,
    nominas,
    impuestos,
    operativos,
    resultado,
    pendientes,
  };
}
