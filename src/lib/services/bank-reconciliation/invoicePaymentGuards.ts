/**
 * Guards y preview de aplicación de cobros/pagos a facturas.
 *
 * Funciones puras que no tocan DB — la parte de acceso a datos vive en
 * `src/lib/queries/invoicePayments.ts`. Sirve para dos casos:
 *
 *   1. Validar antes de insertar un invoice_payments (guards duros).
 *   2. Alimentar el panel de confirmación de la UI con el mismo cálculo
 *      que después va a aplicarse en el servidor.
 *
 * Todos los importes son strings numéricos (numeric(12,2)) para preservar
 * precisión — se convierten a Number sólo dentro de este módulo con la
 * tolerancia ±0.005 usada en el resto del módulo de conciliación.
 */

export type PayableInvoiceKind = 'issued' | 'internal_income' | 'internal_expense';

export type PayableCheckInput = {
  readonly status: string | null;
  readonly totalDue: string;
  readonly previouslyPaid: string;
  readonly amountToApply: string;
  readonly kind: PayableInvoiceKind;
};

export type GuardFailureReason =
  | 'voided'
  | 'already_completed'
  | 'overpayment'
  | 'currency_mismatch';

export const GUARD_ERROR_MESSAGES: Readonly<Record<GuardFailureReason, string>> = {
  voided:            'No se puede aplicar un cobro/pago a una factura anulada.',
  already_completed: 'La factura ya está completamente cobrada/pagada.',
  overpayment:       'El importe a aplicar supera el pendiente de la factura.',
  currency_mismatch: 'La moneda del pago no coincide con la de la factura.',
};

// Error tipado para poder diferenciar en el action layer los rechazos
// esperables (que además se auditan como payment_apply_blocked) de los
// bugs internos.
export class PaymentGuardError extends Error {
  public readonly reason: GuardFailureReason;
  constructor(reason: GuardFailureReason, message?: string) {
    super(message ?? GUARD_ERROR_MESSAGES[reason]);
    this.name = 'PaymentGuardError';
    this.reason = reason;
  }
}

// Tolerancia simétrica con la usada en resolveIssuedInvoiceStatus.
const TOLERANCE = 0.005;

function completedStatusFor(kind: PayableInvoiceKind): string {
  return kind === 'internal_expense' ? 'pagada' : 'cobrada';
}

/**
 * Lanza PaymentGuardError si el estado de la factura o el importe hacen
 * que la aplicación deba rechazarse. No lanza nada si es válido.
 */
export function assertInvoicePayable(input: PayableCheckInput): void {
  const status = (input.status ?? '').trim().toLowerCase();

  if (status === 'anulada') {
    throw new PaymentGuardError('voided');
  }

  if (status === completedStatusFor(input.kind)) {
    throw new PaymentGuardError('already_completed');
  }

  const total = Number(input.totalDue);
  const paid = Number(input.previouslyPaid);
  const applying = Number(input.amountToApply);

  if (!Number.isFinite(total) || !Number.isFinite(paid) || !Number.isFinite(applying)) {
    throw new PaymentGuardError('overpayment', 'Importe inválido');
  }

  if (paid + applying > total + TOLERANCE) {
    throw new PaymentGuardError('overpayment');
  }
}

export type PaymentPreview = {
  readonly totalDue: string;
  readonly previouslyPaid: string;
  readonly remaining: string;
  readonly amountToApply: string;
  readonly resultingPaid: string;
  readonly estimatedStatus: 'cobrada' | 'pagada' | 'parcial';
  readonly wouldOverpay: boolean;
};

function toFixed2(n: number): string {
  return n.toFixed(2);
}

/**
 * Calcula el escenario resultante tras aplicar `amountToApply`. Se usa en
 * el panel de confirmación de la UI para que el usuario vea antes de
 * confirmar. Devuelve `wouldOverpay=true` en vez de lanzar — pintar es
 * responsabilidad del componente.
 */
export function computePaymentPreview(input: PayableCheckInput): PaymentPreview {
  const total = Number(input.totalDue);
  const paid = Number(input.previouslyPaid);
  const applying = Number(input.amountToApply);
  const remaining = Math.max(total - paid, 0);
  const resultingPaid = paid + applying;

  let estimatedStatus: PaymentPreview['estimatedStatus'];
  if (resultingPaid >= total - TOLERANCE) {
    estimatedStatus = input.kind === 'internal_expense' ? 'pagada' : 'cobrada';
  } else {
    estimatedStatus = 'parcial';
  }

  return {
    totalDue: toFixed2(total),
    previouslyPaid: toFixed2(paid),
    remaining: toFixed2(remaining),
    amountToApply: toFixed2(applying),
    resultingPaid: toFixed2(resultingPaid),
    estimatedStatus,
    wouldOverpay: resultingPaid > total + TOLERANCE,
  };
}
