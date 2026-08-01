/**
 * Constantes canónicas para el ciclo de vida del estado de facturas.
 *
 * Source of truth para clasificar `invoices.status` como liquidado vs pendiente.
 * Importar desde aquí en `lib/queries/pnl.ts` y `lib/queries/dashboard.ts` para
 * que la semántica de "pendiente" sea idéntica en P&L y en widgets.
 *
 * Notas:
 * - `borrador` no se considera ni liquidado ni pendiente (no se ha emitido aún).
 * - `cobrada` y `pagada` son ambos "settled" para income y expense (ver
 *   `AGENTS.md` Gotcha: "invoice_status includes cobrada AND pagada").
 * - `anulada` se excluye de cualquier total — facturación cancelada.
 */

import type { InvoiceStatus } from '@/types';

export const SETTLED_INCOME_STATUSES: readonly InvoiceStatus[] = ['cobrada', 'pagada'] as const;
export const SETTLED_EXPENSE_STATUSES: readonly InvoiceStatus[] = ['cobrada', 'pagada'] as const;

/** True when invoice is fully settled (income cobrada or expense pagada — both accepted). */
export function isSettledInvoiceStatus(status: string): boolean {
  return status === 'cobrada' || status === 'pagada';
}

/**
 * Canonical settled status to WRITE when the user marks a movement paid.
 * Income → cobrada; expense → pagada. Never store expense as cobrada from the deal form.
 */
export function settledStatusForKind(kind: 'income' | 'expense'): 'cobrada' | 'pagada' {
  return kind === 'income' ? 'cobrada' : 'pagada';
}

export const PENDING_INCOME_STATUSES: readonly InvoiceStatus[] = [
  'emitida',
  'pendiente',
  'no_cobrada',
  'no_cobrado',
  'parcial',
  'vencida',
] as const;

export const PENDING_EXPENSE_STATUSES: readonly InvoiceStatus[] = [
  'emitida',
  'pendiente',
  'no_pagada',
  'no_pagado',
  'parcial',
  'vencida',
] as const;

/** Mutable copies typed as `InvoiceStatus[]` for drizzle's `inArray`. */
export const PENDING_INCOME_FILTER: InvoiceStatus[] = [...PENDING_INCOME_STATUSES];
export const PENDING_EXPENSE_FILTER: InvoiceStatus[] = [...PENDING_EXPENSE_STATUSES];
