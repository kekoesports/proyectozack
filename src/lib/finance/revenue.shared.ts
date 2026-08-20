/**
 * FV.1 — Definición canónica de "qué es un ingreso" (lógica pura, sin DB).
 *
 * Antes de este módulo cada agregador decidía por su cuenta qué filas contaban
 * como facturación, con criterios incompatibles conviviendo:
 *
 *   - `pnlDetail` / `pnl`  → excluían el espejo pero NUNCA leían `issued_invoices`
 *                            → toda venta emitida desaparecía del P&L (V2).
 *   - `finanzasResumenV2`  → leía ambas tablas, pero deduplicaba solo por `notes`.
 *   - `getBillingKPIs`     → deduplicaba por `notes` OR `concept`, sin emitidas.
 *   - `rentabilidad`       → no deduplicaba nada → la venta se contaba dos veces.
 *
 * A partir de aquí hay una sola respuesta: un ingreso es una factura emitida
 * (`issued_invoices`) más los movimientos internos de tipo income que NO son su
 * espejo automático. El espejo se identifica por FK (`mirror_of_issued_invoice_id`)
 * y, solo para filas anteriores al backfill de la migración 0130, por el prefijo
 * de texto histórico.
 *
 * Este fichero no importa `@/lib/db` a propósito: es lógica pura y se testea sin
 * base de datos (mismo patrón que `financeResumen.shared.ts`).
 */

import {
  ISSUED_MIRROR_CONCEPT_PREFIX,
  ISSUED_MIRROR_NOTES_PREFIX,
} from '@/lib/utils/invoice-status';

// ── Tipos ───────────────────────────────────────────────────────────────────

export type RevenueSource = 'issued' | 'internal';

export type Quarter = 'T1' | 'T2' | 'T3' | 'T4';

/**
 * Fila normalizada de ingreso. Ambas tablas (`issued_invoices` e `invoices`) se
 * proyectan a esta forma antes de agregar.
 */
export type RevenueRow = {
  readonly source: RevenueSource;
  readonly id: number;
  /** 'YYYY-MM-DD'. */
  readonly issueDate: string;
  readonly status: string;
  /** ISO 4217. */
  readonly currency: string;
  /** Importe con IVA, en divisa original. */
  readonly totalAmount: number;
  /** Base imponible, en divisa original. Base de agregación desde FV.3. */
  readonly netAmount: number | null;
  /**
   * Contravalor en EUR ya fijado al tipo de la fecha de operación (FV.4). Cuando
   * existe manda sobre cualquier conversión calculada aquí.
   */
  readonly eurEquivalent: number | null;
  /** Cliente / marca, para el desglose. */
  readonly counterparty: string | null;
  /** Solo `internal`: FK al emitido del que esta fila es espejo. */
  readonly mirrorOfIssuedInvoiceId: number | null;
  /** Solo `internal`: fallback histórico de detección de espejo. */
  readonly notes: string | null;
  readonly concept: string | null;
};

/** Estados que nunca son facturación devengada. */
export const NON_REVENUE_STATUSES: readonly string[] = ['anulada', 'borrador'] as const;

/** Unidades de divisa por 1 EUR. `{ USD: 1.1576 }` ⇒ 1 EUR = 1,1576 USD. */
export type FxRates = Readonly<Record<string, number>>;

export type AggregateRevenueOptions = {
  /** `total` = con IVA (comportamiento histórico) · `net` = base imponible (FV.3). */
  readonly basis?: 'total' | 'net';
  readonly fx?: FxRates;
  /**
   * Qué hacer con una divisa sin tipo de cambio conocido. `as-eur` replica el
   * comportamiento actual (suma 1:1) y lo deja contado en `unconverted`, para
   * que la UI pueda avisar en lugar de mentir en silencio.
   */
  readonly missingFx?: 'as-eur' | 'exclude';
};

export type RevenueBreakdownRow = {
  readonly key: string;
  readonly eur: number;
  readonly nominalByCurrency: Readonly<Record<string, number>>;
  readonly count: number;
};

export type RevenueTotals = {
  readonly count: number;
  /** Total en EUR (contravalor aplicado). */
  readonly eur: number;
  /** Importes sin convertir, por divisa original. */
  readonly nominalByCurrency: Readonly<Record<string, number>>;
  readonly byQuarter: Readonly<Record<Quarter, number>>;
  /** Clave 'YYYY-MM'. */
  readonly byMonth: Readonly<Record<string, number>>;
  readonly byCounterparty: readonly RevenueBreakdownRow[];
  /** Filas sumadas 1:1 por falta de tipo de cambio. > 0 ⇒ el total es aproximado. */
  readonly unconverted: number;
};

// ── Clasificación ───────────────────────────────────────────────────────────

/**
 * True cuando la fila interna es el espejo automático de una factura emitida.
 *
 * Orden deliberado: la FK manda siempre. El prefijo de texto solo se consulta
 * cuando la FK es `null`, y únicamente para cubrir filas anteriores al backfill
 * de la migración 0130 (o espejos ambiguos que el backfill dejó sin enlazar).
 */
export function isIssuedMirrorRow(row: RevenueRow): boolean {
  if (row.source !== 'internal') return false;
  return isMirrorByFkOrPrefix(row.mirrorOfIssuedInvoiceId, row.notes, row.concept);
}

/**
 * Misma decisión que `isIssuedMirrorRow`, sobre los tres campos sueltos, para
 * los agregadores que trabajan con filas propias en vez de con `RevenueRow`.
 */
export function isMirrorByFkOrPrefix(
  mirrorOfIssuedInvoiceId: number | null,
  notes: string | null | undefined,
  concept: string | null | undefined,
): boolean {
  if (mirrorOfIssuedInvoiceId != null) return true;
  if (notes != null && notes.startsWith(ISSUED_MIRROR_NOTES_PREFIX)) return true;
  if (concept != null && concept.startsWith(ISSUED_MIRROR_CONCEPT_PREFIX)) return true;
  return false;
}

/** True cuando la fila debe sumar en "facturado". */
export function countsAsRevenue(row: RevenueRow): boolean {
  if (NON_REVENUE_STATUSES.includes(row.status)) return false;
  return !isIssuedMirrorRow(row);
}

/** Trimestre natural de una fecha 'YYYY-MM-DD'. */
export function quarterOf(isoDate: string): Quarter {
  const month = Number(isoDate.slice(5, 7));
  if (month <= 3) return 'T1';
  if (month <= 6) return 'T2';
  if (month <= 9) return 'T3';
  return 'T4';
}

// ── Conversión ──────────────────────────────────────────────────────────────

export type ConversionResult = { readonly eur: number; readonly converted: boolean };

/**
 * Contravalor en EUR de un importe. El `eurEquivalent` de la fila, si existe,
 * gana sobre cualquier cálculo: es el tipo fijado en la fecha de la operación.
 */
export function toEurAmount(
  amount: number,
  currency: string,
  fx: FxRates | undefined,
  eurEquivalent: number | null,
): ConversionResult {
  if (eurEquivalent != null) return { eur: eurEquivalent, converted: true };
  if (currency === 'EUR') return { eur: amount, converted: true };
  const rate = fx?.[currency];
  if (rate != null && rate > 0) return { eur: amount / rate, converted: true };
  return { eur: amount, converted: false };
}

// ── Agregación ──────────────────────────────────────────────────────────────

function addTo(target: Record<string, number>, key: string, amount: number): void {
  target[key] = (target[key] ?? 0) + amount;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundValues(source: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(source).map(([k, v]) => [k, round2(v)]));
}

/**
 * Agrega filas ya normalizadas: filtra por `countsAsRevenue`, convierte a EUR y
 * desglosa por trimestre, mes y contraparte.
 *
 * El redondeo se aplica solo al final: acumular céntimos redondeados línea a
 * línea desplaza el total varios céntimos sobre un año entero de movimientos.
 */
export function aggregateRevenue(
  rows: readonly RevenueRow[],
  options: AggregateRevenueOptions = {},
): RevenueTotals {
  const basis = options.basis ?? 'total';
  const missingFx = options.missingFx ?? 'as-eur';

  let count = 0;
  let eur = 0;
  let unconverted = 0;
  const nominalByCurrency: Record<string, number> = {};
  const byQuarter: Record<Quarter, number> = { T1: 0, T2: 0, T3: 0, T4: 0 };
  const byMonth: Record<string, number> = {};
  const byCounterparty = new Map<
    string,
    { eur: number; nominal: Record<string, number>; count: number }
  >();

  for (const row of rows) {
    if (!countsAsRevenue(row)) continue;

    const amount = basis === 'net' ? (row.netAmount ?? row.totalAmount) : row.totalAmount;
    const { eur: amountEur, converted } = toEurAmount(
      amount,
      row.currency,
      options.fx,
      row.eurEquivalent,
    );
    if (!converted) {
      if (missingFx === 'exclude') continue;
      unconverted += 1;
    }

    count += 1;
    eur += amountEur;
    addTo(nominalByCurrency, row.currency, amount);
    byQuarter[quarterOf(row.issueDate)] += amountEur;
    addTo(byMonth, row.issueDate.slice(0, 7), amountEur);

    const key = row.counterparty ?? '(Sin contraparte)';
    const entry = byCounterparty.get(key) ?? { eur: 0, nominal: {}, count: 0 };
    entry.eur += amountEur;
    entry.count += 1;
    addTo(entry.nominal, row.currency, amount);
    byCounterparty.set(key, entry);
  }

  return {
    count,
    eur: round2(eur),
    nominalByCurrency: roundValues(nominalByCurrency),
    byQuarter: {
      T1: round2(byQuarter.T1),
      T2: round2(byQuarter.T2),
      T3: round2(byQuarter.T3),
      T4: round2(byQuarter.T4),
    },
    byMonth: roundValues(byMonth),
    byCounterparty: [...byCounterparty.entries()]
      .map(([key, v]) => ({
        key,
        eur: round2(v.eur),
        nominalByCurrency: roundValues(v.nominal),
        count: v.count,
      }))
      .sort((a, b) => b.eur - a.eur),
    unconverted,
  };
}
