'server-only';

import { and, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, invoices, talents, campaigns } from '@/db/schema';
import type { InvoiceWithRelations } from '@/types/invoice';

/**
 * Datos agregados para la sección /admin/finanzas/nominas-creadores (PR 5).
 *
 * Reutiliza `invoices` como fuente única. Discrimina "nóminas internas"
 * vs "pagos a talentos" con:
 *   - Nóminas internas: expense_subtype IN ('nomina_socio', 'seguridad_social', 'cuota_autonomo', 'factura_autonomo')
 *   - Pagos a talentos:  expense_subtype = 'pago_talento' AND talent_id IS NOT NULL
 *
 * No hay tabla dedicada (por diseño — audit §14). Todo read-only.
 */

export type NominasPeriod = { readonly from: string; readonly to: string };

// ── Filtro de subtypes ──────────────────────────────────────────────────
export const NOMINAS_SUBTYPES = [
  'nomina_socio',
  'seguridad_social',
  'cuota_autonomo',
  'factura_autonomo',
] as const;

export const TALENT_SUBTYPES = ['pago_talento'] as const;

// Estados considerados "pagado" para gastos (heredado: `cobrada` legacy
// para gastos = settled). `invoice_status` sigue con enum roto — mapping
// visual en UI, aquí solo agregamos.
const PAID_STATUSES = ['pagada', 'cobrada'] as const;
const PENDING_STATUSES = ['pendiente', 'no_pagada', 'no_pagado', 'parcial', 'vencida', 'emitida'] as const;

// ── Tipos ────────────────────────────────────────────────────────────────

export type NominasKpis = {
  readonly totalNominas: number;
  readonly totalNominasCount: number;
  readonly totalSeguridadSocial: number;
  readonly totalSeguridadSocialCount: number;
  readonly totalTalentos: number;
  readonly totalTalentosCount: number;
  readonly pendienteTalentos: number;
  readonly pendienteTalentosCount: number;
  readonly costeTotalPersonas: number;
  readonly costeTalentoSobreIngresos: number | null;
  readonly topTalentoPorCoste: { readonly name: string; readonly amount: number } | null;
  readonly campanasConPagosPendientes: number;
};

export type NominasBreakdownPoint = {
  readonly month: string; // YYYY-MM
  readonly nominas: number;
  readonly seguridadSocial: number;
  readonly talentos: number;
};

export type TopPersonaRow = {
  readonly name: string;
  readonly amount: number;
  readonly count: number;
};

export type TopTalentoRow = {
  readonly name: string;
  readonly talentId: number;
  readonly amount: number;
  readonly count: number;
  readonly pending: number;
};

export type CampanaConPagoRow = {
  readonly campaignId: number;
  readonly campaignName: string;
  readonly brandName: string | null;
  readonly totalTalentos: number;
  readonly pendiente: number;
  readonly talentosCount: number;
};

export type NominasCreadoresData = {
  readonly period: NominasPeriod;
  readonly kpis: NominasKpis;
  readonly breakdownMonthly: readonly NominasBreakdownPoint[];
  readonly topPersonas: readonly TopPersonaRow[];
  readonly topTalentos: readonly TopTalentoRow[];
  readonly campanasConPagos: readonly CampanaConPagoRow[];
  readonly nominasRows: readonly InvoiceWithRelations[];
  readonly talentosRows: readonly InvoiceWithRelations[];
};

function todayInMadridIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function resolvePeriod(input: { readonly from?: string; readonly to?: string } = {}): NominasPeriod {
  const today = todayInMadridIso();
  return {
    from: input.from ?? `${today.slice(0, 4)}-01-01`,
    to: input.to ?? today,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Query principal ─────────────────────────────────────────────────────

/**
 * Devuelve datos agregados para /admin/finanzas/nominas-creadores.
 * Un solo SELECT + agregación en memoria (volumen actual: ~26 filas).
 */
export async function getNominasCreadoresData(input: { readonly from?: string; readonly to?: string } = {}): Promise<NominasCreadoresData> {
  const period = resolvePeriod(input);
  const allSubtypes = [...NOMINAS_SUBTYPES, ...TALENT_SUBTYPES];

  const rowsRaw = await db
    .select({
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
      inArray(invoices.expenseSubtype, [...allSubtypes]),
    ));

  const rows: InvoiceWithRelations[] = rowsRaw.map((r) => ({ ...r }) as unknown as InvoiceWithRelations);

  // Split rápido
  const nominasRows = rows.filter((r) => (NOMINAS_SUBTYPES as readonly string[]).includes(r.expenseSubtype ?? ''));
  const talentosRows = rows.filter((r) => (TALENT_SUBTYPES as readonly string[]).includes(r.expenseSubtype ?? ''));

  // ── Agregados ────────────────────────────────────────────────
  let totalNominas = 0;
  let totalSS = 0;
  let totalTalentos = 0;
  let pendienteTalentos = 0;
  let ssCount = 0;
  let pendienteTalentosCount = 0;

  const talentMap = new Map<string, { talentId: number; amount: number; count: number; pending: number }>();
  const campanaMap = new Map<number, { name: string; brandName: string | null; totalTalentos: number; pendiente: number; talentSet: Set<number> }>();
  const monthlyMap = new Map<string, { nominas: number; seguridadSocial: number; talentos: number }>();
  const personasMap = new Map<string, { amount: number; count: number }>();

  for (const row of rows) {
    const amount = Number(row.totalAmount);
    if (!Number.isFinite(amount)) continue;
    const isPaid = (PAID_STATUSES as readonly string[]).includes(row.status);
    const isPending = (PENDING_STATUSES as readonly string[]).includes(row.status);
    const month = row.issueDate.slice(0, 7);
    const monthEntry = monthlyMap.get(month) ?? { nominas: 0, seguridadSocial: 0, talentos: 0 };

    if (row.expenseSubtype === 'nomina_socio') {
      totalNominas += amount;
      monthEntry.nominas += amount;
      const key = row.counterpartyName ?? 'Sin nombre';
      const p = personasMap.get(key) ?? { amount: 0, count: 0 };
      p.amount += amount;
      p.count += 1;
      personasMap.set(key, p);
    } else if (row.expenseSubtype === 'seguridad_social') {
      totalSS += amount;
      ssCount += 1;
      monthEntry.seguridadSocial += amount;
    } else if (row.expenseSubtype === 'cuota_autonomo' || row.expenseSubtype === 'factura_autonomo') {
      totalSS += amount;
      ssCount += 1;
      monthEntry.seguridadSocial += amount;
      const key = row.counterpartyName ?? 'Sin nombre';
      const p = personasMap.get(key) ?? { amount: 0, count: 0 };
      p.amount += amount;
      p.count += 1;
      personasMap.set(key, p);
    } else if (row.expenseSubtype === 'pago_talento') {
      totalTalentos += amount;
      monthEntry.talentos += amount;
      if (isPending) {
        pendienteTalentos += amount;
        pendienteTalentosCount += 1;
      }
      if (row.talentId && row.talentName) {
        const talentKey = row.talentName;
        const t = talentMap.get(talentKey) ?? { talentId: row.talentId, amount: 0, count: 0, pending: 0 };
        t.amount += amount;
        t.count += 1;
        if (isPending) t.pending += amount;
        talentMap.set(talentKey, t);
      }
      if (row.campaignId && row.campaignName) {
        const c = campanaMap.get(row.campaignId) ?? {
          name: row.campaignName,
          brandName: row.brandName,
          totalTalentos: 0,
          pendiente: 0,
          talentSet: new Set<number>(),
        };
        c.totalTalentos += amount;
        if (isPending) c.pendiente += amount;
        if (row.talentId) c.talentSet.add(row.talentId);
        campanaMap.set(row.campaignId, c);
      }
    }

    monthlyMap.set(month, monthEntry);
    // silence unused
    void isPaid;
  }

  const topPersonas: readonly TopPersonaRow[] = [...personasMap.entries()]
    .map(([name, v]) => ({ name, amount: round2(v.amount), count: v.count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topTalentos: readonly TopTalentoRow[] = [...talentMap.entries()]
    .map(([name, v]) => ({ name, talentId: v.talentId, amount: round2(v.amount), count: v.count, pending: round2(v.pending) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const campanasConPagos: readonly CampanaConPagoRow[] = [...campanaMap.entries()]
    .map(([campaignId, v]) => ({
      campaignId,
      campaignName: v.name,
      brandName: v.brandName,
      totalTalentos: round2(v.totalTalentos),
      pendiente: round2(v.pendiente),
      talentosCount: v.talentSet.size,
    }))
    .sort((a, b) => b.totalTalentos - a.totalTalentos)
    .slice(0, 10);

  const breakdownMonthly: readonly NominasBreakdownPoint[] = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      nominas: round2(v.nominas),
      seguridadSocial: round2(v.seguridadSocial),
      talentos: round2(v.talentos),
    }));

  // Coste talento sobre ingresos — necesita SUM(income facturado). Query aparte.
  const [ingresosRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)::text` })
    .from(invoices)
    .where(and(
      eq(invoices.kind, 'income'),
      ne(invoices.status, 'anulada'),
      gte(invoices.issueDate, period.from),
      lte(invoices.issueDate, period.to),
    ));
  const ingresosPeriodo = Number(ingresosRow?.total ?? 0);
  const costeTalentoSobreIngresos = ingresosPeriodo > 0
    ? round2((totalTalentos / ingresosPeriodo) * 100)
    : null;

  const costeTotalPersonas = round2(totalNominas + totalSS + totalTalentos);

  const kpis: NominasKpis = {
    totalNominas: round2(totalNominas),
    totalNominasCount: nominasRows.filter((r) => r.expenseSubtype === 'nomina_socio').length,
    totalSeguridadSocial: round2(totalSS),
    totalSeguridadSocialCount: ssCount,
    totalTalentos: round2(totalTalentos),
    totalTalentosCount: talentosRows.length,
    pendienteTalentos: round2(pendienteTalentos),
    pendienteTalentosCount,
    costeTotalPersonas,
    costeTalentoSobreIngresos,
    topTalentoPorCoste: topTalentos[0]
      ? { name: topTalentos[0].name, amount: topTalentos[0].amount }
      : null,
    campanasConPagosPendientes: campanasConPagos.filter((c) => c.pendiente > 0).length,
  };

  return {
    period,
    kpis,
    breakdownMonthly,
    topPersonas,
    topTalentos,
    campanasConPagos,
    nominasRows,
    talentosRows,
  };
}
