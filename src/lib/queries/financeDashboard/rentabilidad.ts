'server-only';

/**
 * Datos agregados para /admin/finanzas/rentabilidad (PR 6A).
 *
 * Compara margen PACTADO (campaigns.amountBrand - amountTalent) contra
 * margen REAL FACTURADO (agregación de invoices reales por campaignId).
 *
 * Read-only. Cero mutaciones. Cero migraciones. Reutiliza tablas existentes:
 *   - campaigns.amountBrand / amountTalent → margen pactado
 *   - invoices con campaignId IS NOT NULL, status ∉ ('anulada','borrador') → real
 *   - expenseSubtype 'pago_talento' → subtotal pagos talentos
 *   - expenseSubtype IN ('coste_produccion','comision_plataforma','otros_campana') → otros costes
 */

import { and, asc, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { campaigns, crmBrands, invoices, talents } from '@/db/schema';

/** Umbral heredado de campaignMargins.ts — mantener sincronizado. */
export const LOW_MARGIN_THRESHOLD = 20;

/** Ingreso real mínimo para considerar "ejecución suficiente" y clasificar rentabilidad. */
export const MIN_INCOME_FOR_CLASSIFICATION = 100;

// Los criterios de filtrado se aplican inline en el SQL agregado:
//   - status NOT IN ('anulada', 'borrador') — excluye borrador y anulada
//   - expense_subtype = 'pago_talento' — pagos a talentos
//   - expense_subtype IN ('coste_produccion','comision_plataforma','otros_campana') — otros directos

// ── Tipos ────────────────────────────────────────────────────────────────

export type RentabilidadEstado =
  | 'rentable'
  | 'bajo'
  | 'negativo'
  | 'sin_datos'
  | 'sin_ejecucion_suficiente';

export type RentabilidadFiltroMargen =
  | 'todos' | 'rentable' | 'bajo' | 'negativo' | 'sin_datos';

export type RentabilidadFilters = {
  readonly from?: string;
  readonly to?: string;
  readonly brandId?: number;
  readonly talentId?: number;
  readonly campaignStatus?: string;
  readonly margenFilter?: RentabilidadFiltroMargen;
};

export type RentabilidadRow = {
  readonly id: number;
  readonly name: string;
  readonly brandId: number | null;
  readonly brandName: string | null;
  readonly talentId: number | null;
  readonly talentName: string | null;
  readonly status: string;

  // Pactado
  readonly amountBrand: number;
  readonly amountTalent: number;
  readonly margenPactado: number | null;
  readonly margenPactadoPct: number | null;

  // Real (agregado desde invoices)
  readonly ingresosReales: number;
  readonly costesReales: number;
  readonly pagosTalentosReales: number;
  readonly otrosCostesDirectosReales: number;
  readonly margenReal: number | null;
  readonly margenRealPct: number | null;

  // Desviación (real% - pactado%)
  readonly desviacionPct: number | null;

  // Estado visual
  readonly estado: RentabilidadEstado;
};

export type RentabilidadKpis = {
  readonly ingresosPactados: number;
  readonly margenPactadoMedio: number | null;
  readonly ingresosRealesAsociados: number;
  readonly margenRealMedio: number | null;
  readonly campanasRentables: number;
  readonly campanasMargenBajo: number;
  readonly campanasNegativas: number;
  readonly mayorDesviacionNegativa: { readonly name: string; readonly deviation: number } | null;
};

export type RentabilidadPeriod = { readonly from: string; readonly to: string };

// ── Rankings (PR 6B) ───────────────────────────────────────────────────

export type RankingMarcaRow = {
  readonly brandId: number;
  readonly brandName: string;
  readonly ingresosReales: number;
  readonly costesReales: number;
  readonly margenReal: number;
  readonly margenRealPct: number | null;
  readonly ingresosPactados: number;
  readonly campanas: number;
};

export type RankingTalentoRow = {
  readonly talentId: number;
  readonly talentName: string;
  readonly costeReal: number;
  readonly ingresosReales: number;
  readonly campanas: number;
  readonly concentracionPctSobreTotal: number; // 0-100
};

export type RankingCampanaDesviacionRow = {
  readonly id: number;
  readonly name: string;
  readonly brandName: string | null;
  readonly talentName: string | null;
  readonly margenPactadoPct: number;
  readonly margenRealPct: number;
  readonly desviacionPct: number;
  readonly ingresosReales: number;
};

export type RentabilidadRankings = {
  readonly topMarcasPorMargen: readonly RankingMarcaRow[];
  readonly topMarcasPorFacturacion: readonly RankingMarcaRow[];
  readonly topTalentosPorCoste: readonly RankingTalentoRow[];
  readonly peoresDesviaciones: readonly RankingCampanaDesviacionRow[];
  readonly clientesInsuficientes: boolean; // siempre true en 6B — sin FK campaign→client fiable
};

// ── Datos para gráficos (PR 6B) ────────────────────────────────────────

export type ChartIngresosVsCostesPoint = {
  readonly id: number;
  readonly name: string;
  readonly ingresosReales: number;
  readonly costesReales: number;
};

export type ChartMargenPorMarcaPoint = {
  readonly brandName: string;
  readonly margenReal: number;
};

export type ChartTalentoCostePoint = {
  readonly talentName: string;
  readonly costeReal: number;
};

export type ChartDistribucionMargen = {
  readonly negativo: number;
  readonly bajo: number;
  readonly rentable: number;
  readonly sinDatos: number;
};

export type RentabilidadCharts = {
  readonly ingresosVsCostesTop15: readonly ChartIngresosVsCostesPoint[];
  readonly margenPorMarcaTop10: readonly ChartMargenPorMarcaPoint[];
  readonly talentosPorCosteTop10: readonly ChartTalentoCostePoint[];
  readonly distribucionMargen: ChartDistribucionMargen;
};

export type RentabilidadData = {
  readonly period: RentabilidadPeriod;
  readonly rows: readonly RentabilidadRow[];
  readonly filteredRows: readonly RentabilidadRow[];
  readonly kpis: RentabilidadKpis;
  readonly rankings: RentabilidadRankings;
  readonly charts: RentabilidadCharts;
  readonly totalCount: number;
  readonly filteredCount: number;
};

// ── Utilidades ─────────────────────────────────────────────────────────────

function todayInMadridIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function resolvePeriod(input: { readonly from?: string; readonly to?: string } = {}): RentabilidadPeriod {
  const today = todayInMadridIso();
  return {
    from: input.from ?? `${today.slice(0, 4)}-01-01`,
    to:   input.to   ?? today,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Clasifica el estado visual de una campaña según su ejecución real.
 *
 * Reglas:
 *   1. amountBrand=0 y sin ingresos reales → 'sin_datos'
 *   2. ingresos reales < MIN_INCOME_FOR_CLASSIFICATION → 'sin_ejecucion_suficiente'
 *      (evita ruido en campañas activas/aprobadas aún sin facturar)
 *   3. margen real % < 0 → 'negativo'
 *   4. margen real % >= 0 y < LOW_MARGIN_THRESHOLD → 'bajo'
 *   5. margen real % >= LOW_MARGIN_THRESHOLD → 'rentable'
 */
export function classifyEstado(input: {
  readonly amountBrand: number;
  readonly ingresosReales: number;
  readonly margenRealPct: number | null;
}): RentabilidadEstado {
  if (input.amountBrand === 0 && input.ingresosReales === 0) return 'sin_datos';
  if (input.ingresosReales < MIN_INCOME_FOR_CLASSIFICATION) return 'sin_ejecucion_suficiente';
  if (input.margenRealPct === null) return 'sin_datos';
  if (input.margenRealPct < 0) return 'negativo';
  if (input.margenRealPct < LOW_MARGIN_THRESHOLD) return 'bajo';
  return 'rentable';
}

// ── Query principal ───────────────────────────────────────────────────────

/**
 * Devuelve el mapa de rentabilidad por campaña.
 * Estrategia: 2 queries (campañas + invoices agregadas), join en memoria.
 * Volumen esperado: 200-1000 campañas activas → aceptable sin materializar.
 */
export async function getRentabilidadData(input: RentabilidadFilters = {}): Promise<RentabilidadData> {
  const period = resolvePeriod(input);

  // ── 1) Campañas del período (por startDate, incluye null) ───────────
  const campaignConds = [
    ne(campaigns.status, 'cancelada'),
  ];
  if (input.brandId)  campaignConds.push(eq(campaigns.brandId, input.brandId));
  if (input.talentId) campaignConds.push(eq(campaigns.talentId, input.talentId));
  if (input.campaignStatus) campaignConds.push(eq(campaigns.status, input.campaignStatus as never));

  // Filtro de período: si la campaña tiene startDate, exigimos que esté en rango.
  // Si no tiene startDate (propuesta sin fechas), la incluimos igualmente para
  // no ocultar campañas recién creadas.
  const periodClause = sql`(${campaigns.startDate} IS NULL OR (${campaigns.startDate} >= ${period.from} AND ${campaigns.startDate} <= ${period.to}))`;
  campaignConds.push(periodClause);

  const campaignRows = await db
    .select({
      id:            campaigns.id,
      name:          campaigns.name,
      brandId:       campaigns.brandId,
      talentId:      campaigns.talentId,
      status:        campaigns.status,
      amountBrand:   campaigns.amountBrand,
      amountTalent:  campaigns.amountTalent,
      brandName:     crmBrands.name,
      talentName:    talents.name,
    })
    .from(campaigns)
    .leftJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
    .leftJoin(talents,   eq(talents.id,   campaigns.talentId))
    .where(and(...campaignConds))
    .orderBy(asc(campaigns.name));

  if (campaignRows.length === 0) {
    return {
      period,
      rows: [],
      filteredRows: [],
      kpis: emptyKpis(),
      rankings: emptyRankings(),
      charts: emptyCharts(),
      totalCount: 0,
      filteredCount: 0,
    };
  }

  const campaignIds = campaignRows.map((c) => c.id);

  // ── 2) Agregado de invoices reales por campaignId ────────────────────
  const invoiceAggRows = await db
    .select({
      campaignId:                 invoices.campaignId,
      ingresosReales:             sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'income'  AND ${invoices.status} NOT IN ('anulada','borrador') THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
      costesReales:               sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'expense' AND ${invoices.status} NOT IN ('anulada','borrador') THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
      pagosTalentosReales:        sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'expense' AND ${invoices.status} NOT IN ('anulada','borrador') AND ${invoices.expenseSubtype} = 'pago_talento' THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
      otrosCostesDirectosReales:  sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'expense' AND ${invoices.status} NOT IN ('anulada','borrador') AND ${invoices.expenseSubtype} IN ('coste_produccion','comision_plataforma','otros_campana') THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
    })
    .from(invoices)
    .where(and(
      isNotNull(invoices.campaignId),
      sql`${invoices.campaignId} IN (${sql.join(campaignIds.map((id) => sql`${id}`), sql`, `)})`,
    ))
    .groupBy(invoices.campaignId);

  const aggByCampaign = new Map<number, {
    ingresosReales: number;
    costesReales: number;
    pagosTalentosReales: number;
    otrosCostesDirectosReales: number;
  }>();
  for (const r of invoiceAggRows) {
    if (r.campaignId === null) continue;
    aggByCampaign.set(r.campaignId, {
      ingresosReales:            Number(r.ingresosReales),
      costesReales:              Number(r.costesReales),
      pagosTalentosReales:       Number(r.pagosTalentosReales),
      otrosCostesDirectosReales: Number(r.otrosCostesDirectosReales),
    });
  }

  // ── 3) Compone RentabilidadRow por campaña ──────────────────────────
  const rows: RentabilidadRow[] = campaignRows.map((c) => {
    const amountBrand  = Number(c.amountBrand ?? 0);
    const amountTalent = Number(c.amountTalent ?? 0);
    const agg = aggByCampaign.get(c.id) ?? {
      ingresosReales: 0,
      costesReales: 0,
      pagosTalentosReales: 0,
      otrosCostesDirectosReales: 0,
    };

    // Pactado
    const margenPactado    = amountBrand > 0 ? round2(amountBrand - amountTalent) : null;
    const margenPactadoPct = amountBrand > 0
      ? round1(((amountBrand - amountTalent) / amountBrand) * 100)
      : null;

    // Real
    const margenReal     = agg.ingresosReales > 0
      ? round2(agg.ingresosReales - agg.costesReales)
      : null;
    const margenRealPct  = agg.ingresosReales > 0
      ? round1(((agg.ingresosReales - agg.costesReales) / agg.ingresosReales) * 100)
      : null;

    // Desviación
    const desviacionPct = (margenPactadoPct !== null && margenRealPct !== null)
      ? round1(margenRealPct - margenPactadoPct)
      : null;

    const estado = classifyEstado({
      amountBrand,
      ingresosReales: agg.ingresosReales,
      margenRealPct,
    });

    return {
      id:                         c.id,
      name:                       c.name,
      brandId:                    c.brandId,
      brandName:                  c.brandName ?? null,
      talentId:                   c.talentId,
      talentName:                 c.talentName ?? null,
      status:                     c.status,
      amountBrand:                round2(amountBrand),
      amountTalent:               round2(amountTalent),
      margenPactado,
      margenPactadoPct,
      ingresosReales:             round2(agg.ingresosReales),
      costesReales:               round2(agg.costesReales),
      pagosTalentosReales:        round2(agg.pagosTalentosReales),
      otrosCostesDirectosReales:  round2(agg.otrosCostesDirectosReales),
      margenReal,
      margenRealPct,
      desviacionPct,
      estado,
    };
  });

  const filteredRows = applyMargenFilter(rows, input.margenFilter ?? 'todos');
  const kpis = computeKpis(rows);
  const rankings = computeRankings(rows);
  const charts = computeCharts(rows);

  return {
    period,
    rows,
    filteredRows,
    kpis,
    rankings,
    charts,
    totalCount: rows.length,
    filteredCount: filteredRows.length,
  };
}

// ── KPIs agregados ─────────────────────────────────────────────────────────

function computeKpis(rows: readonly RentabilidadRow[]): RentabilidadKpis {
  if (rows.length === 0) return emptyKpis();

  const ingresosPactados = round2(rows.reduce((s, r) => s + r.amountBrand, 0));
  const ingresosRealesAsociados = round2(rows.reduce((s, r) => s + r.ingresosReales, 0));

  const withPactado = rows.filter((r) => r.margenPactadoPct !== null);
  const margenPactadoMedio = withPactado.length > 0
    ? round1(withPactado.reduce((s, r) => s + (r.margenPactadoPct ?? 0), 0) / withPactado.length)
    : null;

  const withReal = rows.filter((r) => r.margenRealPct !== null);
  const margenRealMedio = withReal.length > 0
    ? round1(withReal.reduce((s, r) => s + (r.margenRealPct ?? 0), 0) / withReal.length)
    : null;

  const campanasRentables = rows.filter((r) => r.estado === 'rentable').length;
  const campanasMargenBajo = rows.filter((r) => r.estado === 'bajo').length;
  const campanasNegativas = rows.filter((r) => r.estado === 'negativo').length;

  const negativas = rows
    .filter((r) => r.desviacionPct !== null && r.desviacionPct < 0)
    .sort((a, b) => (a.desviacionPct ?? 0) - (b.desviacionPct ?? 0));
  const worst = negativas[0];
  const mayorDesviacionNegativa = worst
    ? { name: worst.name, deviation: worst.desviacionPct ?? 0 }
    : null;

  return {
    ingresosPactados,
    margenPactadoMedio,
    ingresosRealesAsociados,
    margenRealMedio,
    campanasRentables,
    campanasMargenBajo,
    campanasNegativas,
    mayorDesviacionNegativa,
  };
}

function emptyKpis(): RentabilidadKpis {
  return {
    ingresosPactados: 0,
    margenPactadoMedio: null,
    ingresosRealesAsociados: 0,
    margenRealMedio: null,
    campanasRentables: 0,
    campanasMargenBajo: 0,
    campanasNegativas: 0,
    mayorDesviacionNegativa: null,
  };
}

function emptyRankings(): RentabilidadRankings {
  return {
    topMarcasPorMargen: [],
    topMarcasPorFacturacion: [],
    topTalentosPorCoste: [],
    peoresDesviaciones: [],
    clientesInsuficientes: true,
  };
}

function emptyCharts(): RentabilidadCharts {
  return {
    ingresosVsCostesTop15: [],
    margenPorMarcaTop10: [],
    talentosPorCosteTop10: [],
    distribucionMargen: { negativo: 0, bajo: 0, rentable: 0, sinDatos: 0 },
  };
}

// ── Filtro por chip de margen ─────────────────────────────────────────────

function applyMargenFilter(
  rows: readonly RentabilidadRow[],
  filter: RentabilidadFiltroMargen,
): readonly RentabilidadRow[] {
  if (filter === 'todos') return rows;
  if (filter === 'rentable') return rows.filter((r) => r.estado === 'rentable');
  if (filter === 'bajo')     return rows.filter((r) => r.estado === 'bajo');
  if (filter === 'negativo') return rows.filter((r) => r.estado === 'negativo');
  // 'sin_datos' abarca también 'sin_ejecucion_suficiente' desde la UI
  return rows.filter((r) => r.estado === 'sin_datos' || r.estado === 'sin_ejecucion_suficiente');
}

// ── Rankings agregados (PR 6B) ────────────────────────────────────────────

function computeRankings(rows: readonly RentabilidadRow[]): RentabilidadRankings {
  // ── Por marca ────────────────────────────────────────────────────────
  const marcaMap = new Map<number, {
    brandName: string;
    ingresosReales: number;
    costesReales: number;
    ingresosPactados: number;
    campanas: number;
  }>();
  for (const r of rows) {
    if (r.brandId === null || r.brandName === null) continue;
    const entry = marcaMap.get(r.brandId) ?? {
      brandName: r.brandName,
      ingresosReales: 0,
      costesReales: 0,
      ingresosPactados: 0,
      campanas: 0,
    };
    entry.ingresosReales   += r.ingresosReales;
    entry.costesReales     += r.costesReales;
    entry.ingresosPactados += r.amountBrand;
    entry.campanas         += 1;
    marcaMap.set(r.brandId, entry);
  }

  const marcasAll: RankingMarcaRow[] = [...marcaMap.entries()].map(([brandId, v]) => {
    const margenReal = v.ingresosReales - v.costesReales;
    const margenRealPct = v.ingresosReales > 0
      ? round1((margenReal / v.ingresosReales) * 100)
      : null;
    return {
      brandId,
      brandName:        v.brandName,
      ingresosReales:   round2(v.ingresosReales),
      costesReales:     round2(v.costesReales),
      margenReal:       round2(margenReal),
      margenRealPct,
      ingresosPactados: round2(v.ingresosPactados),
      campanas:         v.campanas,
    };
  });

  const topMarcasPorMargen = [...marcasAll]
    .filter((m) => m.ingresosReales > 0) // sin ingresos reales no ordenamos por margen
    .sort((a, b) => b.margenReal - a.margenReal)
    .slice(0, 10);

  const topMarcasPorFacturacion = [...marcasAll]
    .sort((a, b) => b.ingresosReales - a.ingresosReales)
    .slice(0, 10);

  // ── Por talento (coste concentrado) ─────────────────────────────────
  const talentoMap = new Map<number, {
    talentName: string;
    costeReal: number;
    ingresosReales: number;
    campanas: number;
  }>();
  let totalCostesTalentos = 0;
  for (const r of rows) {
    if (r.talentId === null || r.talentName === null) continue;
    const entry = talentoMap.get(r.talentId) ?? {
      talentName: r.talentName,
      costeReal: 0,
      ingresosReales: 0,
      campanas: 0,
    };
    // "Coste real de talento" incluye pagos_talento + amountTalent pactado si no hay ingresos reales?
    // Mantenemos honesto: usamos pagosTalentosReales — el coste real facturado a talento.
    entry.costeReal      += r.pagosTalentosReales;
    entry.ingresosReales += r.ingresosReales;
    entry.campanas       += 1;
    totalCostesTalentos  += r.pagosTalentosReales;
    talentoMap.set(r.talentId, entry);
  }

  const topTalentosPorCoste: RankingTalentoRow[] = [...talentoMap.entries()]
    .map(([talentId, v]) => {
      const concentracion = totalCostesTalentos > 0
        ? round1((v.costeReal / totalCostesTalentos) * 100)
        : 0;
      return {
        talentId,
        talentName:                 v.talentName,
        costeReal:                  round2(v.costeReal),
        ingresosReales:             round2(v.ingresosReales),
        campanas:                   v.campanas,
        concentracionPctSobreTotal: concentracion,
      };
    })
    .filter((t) => t.costeReal > 0)
    .sort((a, b) => b.costeReal - a.costeReal)
    .slice(0, 10);

  // ── Peores desviaciones (campañas concretas) ─────────────────────────
  const peoresDesviaciones: RankingCampanaDesviacionRow[] = rows
    .filter((r) =>
      r.desviacionPct !== null && r.desviacionPct < 0 &&
      r.margenPactadoPct !== null && r.margenRealPct !== null,
    )
    .sort((a, b) => (a.desviacionPct ?? 0) - (b.desviacionPct ?? 0))
    .slice(0, 10)
    .map((r) => ({
      id:               r.id,
      name:             r.name,
      brandName:        r.brandName,
      talentName:       r.talentName,
      margenPactadoPct: r.margenPactadoPct ?? 0,
      margenRealPct:    r.margenRealPct ?? 0,
      desviacionPct:    r.desviacionPct ?? 0,
      ingresosReales:   r.ingresosReales,
    }));

  return {
    topMarcasPorMargen,
    topMarcasPorFacturacion,
    topTalentosPorCoste,
    peoresDesviaciones,
    // En el CRM actual no hay FK fiable de campaña/factura interna → billing_client.
    // billing_clients se usa sólo para facturas EMITIDAS (issued_invoices).
    // Se muestra como "aparcado honesto" en la UI.
    clientesInsuficientes: true,
  };
}

// ── Datos para gráficos (PR 6B) ───────────────────────────────────────────

function computeCharts(rows: readonly RentabilidadRow[]): RentabilidadCharts {
  const ingresosVsCostesTop15: ChartIngresosVsCostesPoint[] = [...rows]
    .filter((r) => r.ingresosReales > 0 || r.costesReales > 0)
    .sort((a, b) => (b.ingresosReales + b.costesReales) - (a.ingresosReales + a.costesReales))
    .slice(0, 15)
    .map((r) => ({
      id:             r.id,
      name:           r.name,
      ingresosReales: r.ingresosReales,
      costesReales:   r.costesReales,
    }));

  const marcaMap = new Map<string, number>();
  for (const r of rows) {
    if (r.brandName === null) continue;
    const margenReal = r.ingresosReales - r.costesReales;
    marcaMap.set(r.brandName, (marcaMap.get(r.brandName) ?? 0) + margenReal);
  }
  const margenPorMarcaTop10: ChartMargenPorMarcaPoint[] = [...marcaMap.entries()]
    .filter(([, v]) => v !== 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([brandName, margenReal]) => ({ brandName, margenReal: round2(margenReal) }));

  const talentoCosteMap = new Map<string, number>();
  for (const r of rows) {
    if (r.talentName === null || r.pagosTalentosReales <= 0) continue;
    talentoCosteMap.set(r.talentName, (talentoCosteMap.get(r.talentName) ?? 0) + r.pagosTalentosReales);
  }
  const talentosPorCosteTop10: ChartTalentoCostePoint[] = [...talentoCosteMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([talentName, costeReal]) => ({ talentName, costeReal: round2(costeReal) }));

  const distribucionMargen: ChartDistribucionMargen = {
    negativo:  rows.filter((r) => r.estado === 'negativo').length,
    bajo:      rows.filter((r) => r.estado === 'bajo').length,
    rentable:  rows.filter((r) => r.estado === 'rentable').length,
    sinDatos:  rows.filter((r) => r.estado === 'sin_datos' || r.estado === 'sin_ejecucion_suficiente').length,
  };

  return {
    ingresosVsCostesTop15,
    margenPorMarcaTop10,
    talentosPorCosteTop10,
    distribucionMargen,
  };
}
