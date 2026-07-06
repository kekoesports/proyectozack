/**
 * Mapping visual de estados de factura a las 7 categorías canónicas para
 * UI. NO cambia DB — el enum `invoice_status` sigue con 12 valores
 * (duplicados/solapamientos documentados en `docs/finanzas-audit.md` §7).
 *
 * Se usa en la sección de Ingresos (PR 3) y donde queramos consistencia
 * visual sin migrar datos.
 *
 * Categorías canónicas:
 *   - borrador  → factura no emitida todavía
 *   - emitida   → emitida y pendiente de cobrar
 *   - parcial   → cobrada en parte
 *   - cobrada   → cobrada al 100%
 *   - vencida   → pasada la fecha de vencimiento sin cobrar
 *   - cancelada → anulada
 *   - pendiente → catch-all para estados heredados poco claros
 */

export type InvoiceStatusDisplay =
  | 'borrador'
  | 'emitida'
  | 'parcial'
  | 'cobrada'
  | 'vencida'
  | 'cancelada'
  | 'pendiente';

const STATUS_DISPLAY_MAP: Readonly<Record<string, InvoiceStatusDisplay>> = {
  borrador:    'borrador',
  emitida:     'emitida',
  parcial:     'parcial',
  cobrada:     'cobrada',
  pagada:      'cobrada',   // pagada aparece históricamente en algunos incomes
  vencida:     'vencida',
  anulada:     'cancelada',
  pendiente:   'pendiente',
  no_cobrada:  'pendiente',
  no_cobrado:  'pendiente',
  no_pagada:   'pendiente',
  no_pagado:   'pendiente',
};

/**
 * Normaliza cualquier valor del enum legacy `invoice_status` (o del varchar
 * de `issued_invoices.status`) a una de las 7 categorías canónicas para UI.
 */
export function normalizeInvoiceStatusForDisplay(raw: string | null | undefined): InvoiceStatusDisplay {
  if (!raw) return 'pendiente';
  const key = raw.trim().toLowerCase();
  return STATUS_DISPLAY_MAP[key] ?? 'pendiente';
}

/** Copy en español para pintar el badge. */
export const INVOICE_STATUS_DISPLAY_LABELS: Readonly<Record<InvoiceStatusDisplay, string>> = {
  borrador:  'Borrador',
  emitida:   'Emitida',
  parcial:   'Parcial',
  cobrada:   'Cobrada',
  vencida:   'Vencida',
  cancelada: 'Cancelada',
  pendiente: 'Pendiente',
};

/**
 * Semántica de color por estado — se usa para pintar badges/pills en la
 * tabla de ingresos. Tokens del design system:
 *   verde/emerald = cobrado/positivo
 *   ámbar         = pendiente/atención
 *   rojo          = vencido/urgente
 *   gris          = neutro (borrador/cancelada)
 */
export const INVOICE_STATUS_DISPLAY_SEMANTIC: Readonly<Record<InvoiceStatusDisplay, 'positive' | 'attention' | 'negative' | 'neutral'>> = {
  borrador:  'neutral',
  emitida:   'attention',
  parcial:   'attention',
  cobrada:   'positive',
  vencida:   'negative',
  cancelada: 'neutral',
  pendiente: 'attention',
};
