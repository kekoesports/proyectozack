'server-only';

import { and, eq, gte, isNull, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, invoicePayments, invoices, talents, campaigns } from '@/db/schema';
import type { InvoiceWithRelations } from '@/types/invoice';
import type { ExpenseSubtypeValue } from '@/lib/schemas/invoice';
import { EXPENSE_SUBTYPE_LABELS } from '@/lib/schemas/invoice';

/**
 * Datos agregados para la sección /admin/finanzas/gastos (PR 4).
 *
 * Reutiliza los datos de `invoices` kind=expense. No ejecuta writes ni
 * migraciones. Los agregados de "sin clasificar" filtran por
 * `expense_group IS NULL` (fuente canónica del audit §7).
 */

export type GastosPeriod = { readonly from: string; readonly to: string };

export type GastosKpis = {
  readonly gastoTotal: number;
  readonly pagado: number;
  readonly pendientePago: number;
  readonly costesDirectos: number;
  readonly gastosOperativos: number;
  readonly sinClasificar: { readonly amount: number; readonly count: number };
  readonly proveedorPrincipal: { readonly name: string; readonly amount: number } | null;
  readonly mayorCategoria: { readonly subtype: ExpenseSubtypeValue | 'sin_clasificar'; readonly label: string; readonly amount: number } | null;
};

export type GastosBreakdownByGroup = readonly {
  readonly group: 'campaign_direct' | 'operational' | 'sin_clasificar';
  readonly label: string;
  readonly amount: number;
  readonly count: number;
}[];

export type GastosBreakdownBySubtype = readonly {
  readonly subtype: ExpenseSubtypeValue | 'sin_clasificar';
  readonly label: string;
  readonly amount: number;
  readonly count: number;
}[];

export type GastosMonthlyPoint = {
  readonly month: string; // 'YYYY-MM'
  readonly directos: number;
  readonly operativos: number;
  readonly sinClasificar: number;
};

export type GastosTopProveedor = {
  readonly name: string;
  readonly amount: number;
  readonly count: number;
};

export type GastosData = {
  readonly period: GastosPeriod;
  readonly kpis: GastosKpis;
  readonly byGroup: GastosBreakdownByGroup;
  readonly bySubtype: GastosBreakdownBySubtype;
  readonly monthly: readonly GastosMonthlyPoint[];
  readonly topProveedores: readonly GastosTopProveedor[];
  readonly rows: readonly InvoiceWithRelations[];
  readonly sinClasificarRows: readonly InvoiceWithRelations[];
};

function todayInMadridIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function resolvePeriod(input: { readonly from?: string; readonly to?: string } = {}): GastosPeriod {
  const today = todayInMadridIso();
  return {
    from: input.from ?? `${today.slice(0, 4)}-01-01`,
    to: input.to ?? today,
  };
}

const PAID_STATUSES: readonly string[] = ['pagada', 'cobrada'];
const PENDING_STATUSES: readonly string[] = ['pendiente', 'no_pagada', 'no_pagado', 'parcial', 'vencida', 'emitida'];

/**
 * Query principal — todas las filas de gasto del periodo con sus relaciones,
 * más los agregados computados en memoria (poco volumen: ~52 rows hoy).
 */
export async function getGastosData(input: { readonly from?: string; readonly to?: string } = {}): Promise<GastosData> {
  const period = resolvePeriod(input);

  const rowsRaw = await db
    .select({
      // Campos del invoice
      id: invoices.id,
      kind: invoices.kind,
      scope: invoices.scope,
      number: invoices.number,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      paidDate: invoices.paidDate,
      brandId: invoices.brandId,
      talentId: invoices.talentId,
      campaignId: invoices.campaignId,
      counterpartyName: invoices.counterpartyName,
      concept: invoices.concept,
      description: invoices.description,
      category: invoices.category,
      aiToolName: invoices.aiToolName,
      expenseGroup: invoices.expenseGroup,
      expenseSubtype: invoices.expenseSubtype,
      netAmount: invoices.netAmount,
      vatPct: invoices.vatPct,
      withholdingPct: invoices.withholdingPct,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      currency: invoices.currency,
      series: invoices.series,
      status: invoices.status,
      company: invoices.company,
      paymentMethod: invoices.paymentMethod,
      aiTool: invoices.aiTool,
      txId: invoices.txId,
      fileUrl: invoices.fileUrl,
      filePath: invoices.filePath,
      receiptFileUrl: invoices.receiptFileUrl,
      receiptFilePath: invoices.receiptFilePath,
      invoiceFileId: invoices.invoiceFileId,
      statementFileId: invoices.statementFileId,
      notes: invoices.notes,
      createdByUserId: invoices.createdByUserId,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      // Relaciones ligeras
      brandName: crmBrands.name,
      talentName: talents.name,
      campaignName: campaigns.name,
    })
    .from(invoices)
    .leftJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
    .leftJoin(talents, eq(talents.id, invoices.talentId))
    .leftJoin(campaigns, eq(campaigns.id, invoices.campaignId))
    .where(and(
      eq(invoices.kind, 'expense'),
      ne(invoices.status, 'anulada'),
      gte(invoices.issueDate, period.from),
      lte(invoices.issueDate, period.to),
    ));

  // `InvoiceWithRelations = Invoice & { brandName, talentName, campaignName }`
  // — el join server-side ya devuelve esos campos con el nombre correcto.
  const rows: InvoiceWithRelations[] = rowsRaw.map((r) => ({ ...r }) as unknown as InvoiceWithRelations);

  // ── Agregados en memoria ────────────────────────────────────────────
  let gastoTotal = 0;
  let pagado = 0;
  let pendientePago = 0;
  let costesDirectos = 0;
  let gastosOperativos = 0;
  let sinClasificarAmount = 0;
  let sinClasificarCount = 0;

  const proveedorMap = new Map<string, { amount: number; count: number }>();
  const bySubtypeMap = new Map<string, { amount: number; count: number }>();
  const monthlyMap = new Map<string, { directos: number; operativos: number; sinClasificar: number }>();
  const sinClasificarRows: InvoiceWithRelations[] = [];

  for (const row of rows) {
    const amount = Number(row.totalAmount);
    if (!Number.isFinite(amount)) continue;

    gastoTotal += amount;
    if (PAID_STATUSES.includes(row.status)) pagado += amount;
    if (PENDING_STATUSES.includes(row.status)) pendientePago += amount;

    const group: 'campaign_direct' | 'operational' | 'sin_clasificar' =
      row.expenseGroup === 'campaign_direct' ? 'campaign_direct'
      : row.expenseGroup === 'operational' ? 'operational'
      : 'sin_clasificar';

    if (group === 'campaign_direct') costesDirectos += amount;
    else if (group === 'operational') gastosOperativos += amount;
    else {
      sinClasificarAmount += amount;
      sinClasificarCount += 1;
      sinClasificarRows.push(row);
    }

    // Top proveedores — cae a concept si no hay counterpartyName.
    const provKey = (row.counterpartyName ?? row.concept ?? '(Sin proveedor)').slice(0, 100);
    const existing = proveedorMap.get(provKey) ?? { amount: 0, count: 0 };
    existing.amount += amount;
    existing.count += 1;
    proveedorMap.set(provKey, existing);

    // Breakdown por subtype.
    const stKey = row.expenseSubtype ?? 'sin_clasificar';
    const st = bySubtypeMap.get(stKey) ?? { amount: 0, count: 0 };
    st.amount += amount;
    st.count += 1;
    bySubtypeMap.set(stKey, st);

    // Monthly.
    const month = row.issueDate.slice(0, 7);
    const mo = monthlyMap.get(month) ?? { directos: 0, operativos: 0, sinClasificar: 0 };
    if (group === 'campaign_direct') mo.directos += amount;
    else if (group === 'operational') mo.operativos += amount;
    else mo.sinClasificar += amount;
    monthlyMap.set(month, mo);
  }

  const byGroup: GastosBreakdownByGroup = [
    { group: 'campaign_direct', label: 'Costes directos', amount: round2(costesDirectos), count: rows.filter((r) => r.expenseGroup === 'campaign_direct').length },
    { group: 'operational',     label: 'Operativos',      amount: round2(gastosOperativos), count: rows.filter((r) => r.expenseGroup === 'operational').length },
    { group: 'sin_clasificar',  label: 'Sin clasificar',  amount: round2(sinClasificarAmount), count: sinClasificarCount },
  ];

  const bySubtype: GastosBreakdownBySubtype = [...bySubtypeMap.entries()]
    .map(([st, v]) => ({
      subtype: st as ExpenseSubtypeValue | 'sin_clasificar',
      label: st === 'sin_clasificar' ? 'Sin clasificar' : (EXPENSE_SUBTYPE_LABELS[st as ExpenseSubtypeValue] ?? st),
      amount: round2(v.amount),
      count: v.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthly: readonly GastosMonthlyPoint[] = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      directos:      round2(v.directos),
      operativos:    round2(v.operativos),
      sinClasificar: round2(v.sinClasificar),
    }));

  const topProveedores: readonly GastosTopProveedor[] = [...proveedorMap.entries()]
    .map(([name, v]) => ({ name, amount: round2(v.amount), count: v.count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const proveedorPrincipal = topProveedores[0]
    ? { name: topProveedores[0].name, amount: topProveedores[0].amount }
    : null;

  const mayorCategoria = bySubtype[0]
    ? { subtype: bySubtype[0].subtype, label: bySubtype[0].label, amount: bySubtype[0].amount }
    : null;

  const kpis: GastosKpis = {
    gastoTotal: round2(gastoTotal),
    pagado: round2(pagado),
    pendientePago: round2(pendientePago),
    costesDirectos: round2(costesDirectos),
    gastosOperativos: round2(gastosOperativos),
    sinClasificar: { amount: round2(sinClasificarAmount), count: sinClasificarCount },
    proveedorPrincipal,
    mayorCategoria,
  };

  return { period, kpis, byGroup, bySubtype, monthly, topProveedores, rows, sinClasificarRows };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Silence unused import warning — `sql` and `invoicePayments`/`isNull` mantenidos
// para futuras extensiones (integración con invoice_payments para "Pagado real"
// cuando haya conciliación bancaria).
void sql;
void invoicePayments;
void isNull;
