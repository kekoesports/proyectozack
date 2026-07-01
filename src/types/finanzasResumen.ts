/**
 * Tipos para el resumen económico anual/YTD de Finanzas.
 *
 * Fuente canónica de pagos: `invoice_payments`. No se usa `invoices.paidAmount`
 * (deprecated — TD-14).
 */

export type FinanzasPeriod = {
  readonly from: string; // 'YYYY-MM-DD' inclusive
  readonly to:   string; // 'YYYY-MM-DD' inclusive
};

// ── Ingresos ────────────────────────────────────────────────────────────────

export type FinanzasResumenIngresos = {
  /** SUM(invoice_payments.amount) sobre income cuyo paymentDate ∈ periodo. */
  readonly cobrados: number;
  /** SUM(totalAmount) de income no-anulada con issueDate ∈ periodo. */
  readonly facturados: number;
  /** facturados − cobrados. Nunca negativo. */
  readonly pendientes: number;
};

// ── Costes directos de campaña ──────────────────────────────────────────────

export type FinanzasResumenCosteBucket = {
  readonly pagados:   number;
  readonly pendientes: number;
};

export type FinanzasResumenCostesDirectos = {
  readonly pagados:     number;
  readonly pendientes:  number;
  readonly total:       number; // pagados + pendientes
  readonly pagosTalento:      FinanzasResumenCosteBucket;
  readonly costesProduccion:  FinanzasResumenCosteBucket;
};

// ── Margen bruto ────────────────────────────────────────────────────────────

export type FinanzasResumenMargenBruto = {
  readonly cobrado:   number; // ingresos.cobrados  − costesDirectos.pagados
  readonly pendiente: number; // ingresos.pendientes − costesDirectos.pendientes
};

// ── Nóminas ─────────────────────────────────────────────────────────────────

export type FinanzasResumenNominas = {
  readonly pablo:   number;
  readonly alfonso: number;
  readonly otros:   number;
  readonly total:   number;
  readonly count:   number;
};

// ── Impuestos y cargas ──────────────────────────────────────────────────────

export type FinanzasResumenImpuestos = {
  readonly cuotaAutonomoPablo:   number;
  readonly cuotaAutonomoAlfonso: number;
  readonly cuotaAutonomoOtros:   number;
  readonly seguridadSocial:      number;
  readonly fiscal:               number; // fiscal_impuestos + ajuste_fiscal
  readonly total:                number;
  readonly count:                number;
};

// ── Gastos operativos reales ────────────────────────────────────────────────

export type FinanzasResumenOperativos = {
  readonly gestoria:       number;
  readonly softwareIa:     number;
  readonly hostingDominio: number;
  readonly seguroMedico:   number;
  readonly comisiones:     number;
  readonly marketing:      number;
  readonly otros:          number; // gasto_general + operational sin subtype conocido
  readonly sinClasificar:  number; // expense sin group/subtype
  readonly total:          number;
  readonly count:          number;
};

// ── Resultado operativo ─────────────────────────────────────────────────────

export type FinanzasResumenResultado = {
  /**
   * = margenBruto.cobrado − nominas.total − impuestos.total − operativos.total
   *
   * Enfoque caja (usa cobrados como base) — refleja lo que efectivamente ha
   * entrado y salido en el periodo, no lo pendiente.
   */
  readonly operativo: number;
};

// ── Pendientes destacados ───────────────────────────────────────────────────

export type PendienteItem = {
  readonly id: number;
  readonly source: 'issued' | 'internal';
  readonly label: string;
  readonly amount: number;
  readonly dueDate: string | null;
  /** Positivo si vencida hace N días; negativo si aún no vence; null si sin dueDate. */
  readonly daysOverdue: number | null;
};

export type FinanzasResumenPendienteBucket = {
  readonly total: number;
  readonly count: number;
  readonly top:   readonly PendienteItem[]; // top 5 por importe pendiente
};

export type FinanzasResumenPendientes = {
  readonly cobrosCampanas:  FinanzasResumenPendienteBucket;
  readonly pagosTalento:    FinanzasResumenPendienteBucket;
  readonly pagosOperativo:  FinanzasResumenPendienteBucket;
  /** cobros pendientes − pagos talento pendientes (informativo). */
  readonly margenPendienteEstimado: number;
};

// ── Root ────────────────────────────────────────────────────────────────────

export type FinanzasResumenV2 = {
  readonly period:          FinanzasPeriod;
  readonly ingresos:        FinanzasResumenIngresos;
  readonly costesDirectos:  FinanzasResumenCostesDirectos;
  readonly margenBruto:     FinanzasResumenMargenBruto;
  readonly nominas:         FinanzasResumenNominas;
  readonly impuestos:       FinanzasResumenImpuestos;
  readonly operativos:      FinanzasResumenOperativos;
  readonly resultado:       FinanzasResumenResultado;
  readonly pendientes:      FinanzasResumenPendientes;
};
