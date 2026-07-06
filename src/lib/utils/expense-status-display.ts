/**
 * Mapping visual del estado de facturas de gasto (`invoices.status`) a
 * 6 categorías canónicas para UI. NO cambia DB — el enum sigue con 12
 * valores (documentado en `docs/finanzas-audit.md` §7).
 *
 * Categorías:
 *   pagado    — factura efectivamente pagada
 *   parcial   — pagada en parte
 *   pendiente — no pagada (aún dentro de plazo o sin fecha)
 *   vencido   — pendiente con fecha de vencimiento pasada
 *   cancelado — anulada
 *   sin_clasificar — flag adicional (no viene del enum, se calcula en la UI
 *     cuando el gasto no tiene expense_group). Se usa como badge extra.
 */

export type ExpenseStatusDisplay =
  | 'pagado'
  | 'parcial'
  | 'pendiente'
  | 'vencido'
  | 'cancelado';

const STATUS_MAP: Readonly<Record<string, ExpenseStatusDisplay>> = {
  pagada:     'pagado',
  pagado:     'pagado',
  cobrada:    'pagado',      // legacy: algunos gastos marcados como cobrada
  cobrado:    'pagado',
  parcial:    'parcial',
  vencida:    'vencido',
  vencido:    'vencido',
  anulada:    'cancelado',
  anulado:    'cancelado',
  pendiente:  'pendiente',
  borrador:   'pendiente',
  emitida:    'pendiente',
  no_cobrada: 'pendiente',
  no_cobrado: 'pendiente',
  no_pagada:  'pendiente',
  no_pagado:  'pendiente',
};

export function normalizeExpenseStatusForDisplay(raw: string | null | undefined): ExpenseStatusDisplay {
  if (!raw) return 'pendiente';
  const key = raw.trim().toLowerCase();
  return STATUS_MAP[key] ?? 'pendiente';
}

export const EXPENSE_STATUS_DISPLAY_LABELS: Readonly<Record<ExpenseStatusDisplay, string>> = {
  pagado:    'Pagado',
  parcial:   'Parcial',
  pendiente: 'Pendiente',
  vencido:   'Vencido',
  cancelado: 'Cancelado',
};

/** Semántica de color por estado. */
export const EXPENSE_STATUS_DISPLAY_SEMANTIC: Readonly<Record<ExpenseStatusDisplay, 'positive' | 'attention' | 'negative' | 'neutral'>> = {
  pagado:    'positive',
  parcial:   'attention',
  pendiente: 'attention',
  vencido:   'negative',
  cancelado: 'neutral',
};
