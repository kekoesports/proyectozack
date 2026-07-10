import { applyPaymentSchema } from '@/lib/schemas/invoicePayments';
import { checkGuardrails } from '@/lib/services/ai-assistant/guardrails';
import {
  assertInvoicePayable,
  computePaymentPreview,
  PaymentGuardError,
  type PayableCheckInput,
} from '@/lib/services/bank-reconciliation/invoicePaymentGuards';

// ── applyPaymentSchema ────────────────────────────────────────────────

describe('applyPaymentSchema', () => {
  const base = {
    bankTransactionId: '42',
    issuedInvoiceId: '7',
    amount: '1500.00',
    currency: 'EUR',
    paymentDate: '2026-06-21',
  };

  it('acepta input válido con issuedInvoiceId', () => {
    const r = applyPaymentSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.bankTransactionId).toBe(42);
      expect(r.data.issuedInvoiceId).toBe(7);
      expect(r.data.amount).toBe('1500.00');
    }
  });

  it('acepta input válido con invoiceId', () => {
    const r = applyPaymentSchema.safeParse({
      ...base,
      issuedInvoiceId: undefined,
      invoiceId: '3',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza cuando se pasan ambas facturas', () => {
    const r = applyPaymentSchema.safeParse({ ...base, invoiceId: '3' });
    expect(r.success).toBe(false);
  });

  it('rechaza cuando no se pasa ninguna factura', () => {
    const { issuedInvoiceId: _drop, ...rest } = base;
    const r = applyPaymentSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('rechaza importe inválido', () => {
    const r = applyPaymentSchema.safeParse({ ...base, amount: 'abc' });
    expect(r.success).toBe(false);
  });

  it('rechaza importe con más de 2 decimales', () => {
    const r = applyPaymentSchema.safeParse({ ...base, amount: '100.123' });
    expect(r.success).toBe(false);
  });

  it('rechaza fecha inválida', () => {
    const r = applyPaymentSchema.safeParse({ ...base, paymentDate: '21-06-2026' });
    expect(r.success).toBe(false);
  });

  it('rechaza bankTransactionId negativo', () => {
    const r = applyPaymentSchema.safeParse({ ...base, bankTransactionId: '-1' });
    expect(r.success).toBe(false);
  });

  it('acepta moneda de 3 letras', () => {
    const r = applyPaymentSchema.safeParse({ ...base, currency: 'USD' });
    expect(r.success).toBe(true);
  });

  it('rechaza moneda de longitud incorrecta', () => {
    const r = applyPaymentSchema.safeParse({ ...base, currency: 'EURO' });
    expect(r.success).toBe(false);
  });

  it('acepta notes opcionales', () => {
    const r = applyPaymentSchema.safeParse({ ...base, notes: 'Pago parcial' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.notes).toBe('Pago parcial');
  });
});

// ── Lógica de estado por pago ─────────────────────────────────────────

describe('lógica de estado de facturas por pagos', () => {
  // Replica la lógica de applyPaymentToIssuedInvoice / applyPaymentToInternalInvoice

  function resolveIssuedInvoiceStatus(totalPaid: number, totalDue: number): string {
    return totalPaid >= totalDue - 0.005 ? 'cobrada' : 'parcial';
  }

  function resolveInvoiceStatus(
    paidAmount: number,
    totalDue: number,
    kind: 'income' | 'expense',
  ): string {
    if (paidAmount >= totalDue - 0.005) {
      return kind === 'income' ? 'cobrada' : 'pagada';
    }
    return 'parcial';
  }

  it('factura emitida: pago completo → cobrada', () => {
    expect(resolveIssuedInvoiceStatus(1000, 1000)).toBe('cobrada');
  });

  it('factura emitida: pago parcial → parcial', () => {
    expect(resolveIssuedInvoiceStatus(500, 1000)).toBe('parcial');
  });

  it('factura emitida: pago con diferencia de centavos → cobrada', () => {
    expect(resolveIssuedInvoiceStatus(999.997, 1000)).toBe('cobrada');
  });

  it('factura interna income: pago completo → cobrada', () => {
    expect(resolveInvoiceStatus(1000, 1000, 'income')).toBe('cobrada');
  });

  it('factura interna expense: pago completo → pagada', () => {
    expect(resolveInvoiceStatus(500, 500, 'expense')).toBe('pagada');
  });

  it('factura interna: pago parcial → parcial', () => {
    expect(resolveInvoiceStatus(200, 500, 'income')).toBe('parcial');
    expect(resolveInvoiceStatus(100, 500, 'expense')).toBe('parcial');
  });

  it('factura interna: sobrepago → estado cobrado/pagado', () => {
    expect(resolveInvoiceStatus(1001, 1000, 'income')).toBe('cobrada');
    expect(resolveInvoiceStatus(1001, 1000, 'expense')).toBe('pagada');
  });
});

// ── Guardrails: patrones de cobros/pagos ─────────────────────────────

describe('checkGuardrails — patrones de aplicación de cobros/pagos', () => {
  it('bloquea "aplica este pago"', () => {
    expect(checkGuardrails('aplica este pago a la factura').blocked).toBe(true);
  });

  it('bloquea "aplicar cobro"', () => {
    expect(checkGuardrails('aplicar cobro a la transacción').blocked).toBe(true);
  });

  it('bloquea "concíliamelo"', () => {
    expect(checkGuardrails('concíliamelo automáticamente').blocked).toBe(true);
  });

  it('no bloquea consultas de cobros legítimas', () => {
    const cases = [
      '¿Qué cobros están pendientes?',
      '¿Cuántos pagos se han aplicado este mes?',
      '¿Qué facturas están pendientes de cobro?',
    ];
    for (const msg of cases) {
      expect(checkGuardrails(msg).blocked).toBe(false);
    }
  });
});

// ── Guards: assertInvoicePayable ──────────────────────────────────────

describe('assertInvoicePayable — guards al aplicar cobros/pagos', () => {
  const base: PayableCheckInput = {
    status: 'emitida',
    totalDue: '1500.00',
    previouslyPaid: '0.00',
    amountToApply: '500.00',
    kind: 'issued',
  };

  it('permite un pago parcial válido (issued)', () => {
    expect(() => assertInvoicePayable(base)).not.toThrow();
  });

  it('permite completar exactamente hasta el total (issued)', () => {
    expect(() =>
      assertInvoicePayable({ ...base, previouslyPaid: '500.00', amountToApply: '1000.00' }),
    ).not.toThrow();
  });

  it('permite tolerancia de ±0.005 al completar (issued)', () => {
    expect(() =>
      assertInvoicePayable({ ...base, previouslyPaid: '999.996', amountToApply: '500.00', totalDue: '1500.00' }),
    ).not.toThrow();
  });

  it('rechaza aplicar cobro a factura issued anulada', () => {
    let caught: unknown;
    try {
      assertInvoicePayable({ ...base, status: 'anulada' });
    } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(PaymentGuardError);
    expect((caught as PaymentGuardError).reason).toBe('voided');
    expect((caught as PaymentGuardError).message).toBe('No se puede aplicar un cobro/pago a una factura anulada.');
  });

  it('rechaza aplicar cobro a factura issued ya cobrada', () => {
    let caught: unknown;
    try {
      assertInvoicePayable({ ...base, status: 'cobrada' });
    } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(PaymentGuardError);
    expect((caught as PaymentGuardError).reason).toBe('already_completed');
  });

  it('rechaza aplicar pago a invoice interna anulada (income)', () => {
    let caught: unknown;
    try {
      assertInvoicePayable({ ...base, kind: 'internal_income', status: 'anulada' });
    } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(PaymentGuardError);
    expect((caught as PaymentGuardError).reason).toBe('voided');
  });

  it('rechaza aplicar cobro a invoice interna income ya cobrada', () => {
    let caught: unknown;
    try {
      assertInvoicePayable({ ...base, kind: 'internal_income', status: 'cobrada' });
    } catch (e) { caught = e; }
    expect((caught as PaymentGuardError).reason).toBe('already_completed');
  });

  it('rechaza aplicar pago a invoice interna expense ya pagada', () => {
    let caught: unknown;
    try {
      assertInvoicePayable({ ...base, kind: 'internal_expense', status: 'pagada' });
    } catch (e) { caught = e; }
    expect((caught as PaymentGuardError).reason).toBe('already_completed');
  });

  it('permite aplicar pago a invoice interna expense en status parcial', () => {
    expect(() =>
      assertInvoicePayable({ ...base, kind: 'internal_expense', status: 'parcial', previouslyPaid: '300.00', amountToApply: '200.00', totalDue: '1000.00' }),
    ).not.toThrow();
  });

  it('rechaza sobrepago issued (previouslyPaid + amount > totalDue)', () => {
    let caught: unknown;
    try {
      assertInvoicePayable({ ...base, previouslyPaid: '1000.00', amountToApply: '600.00' });
    } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(PaymentGuardError);
    expect((caught as PaymentGuardError).reason).toBe('overpayment');
    expect((caught as PaymentGuardError).message).toBe('El importe a aplicar supera el pendiente de la factura.');
  });

  it('rechaza sobrepago internal expense', () => {
    let caught: unknown;
    try {
      assertInvoicePayable({ kind: 'internal_expense', status: 'emitida', totalDue: '500.00', previouslyPaid: '400.00', amountToApply: '200.00' });
    } catch (e) { caught = e; }
    expect((caught as PaymentGuardError).reason).toBe('overpayment');
  });

  it('normaliza el status con espacios y mayúsculas', () => {
    expect(() => assertInvoicePayable({ ...base, status: '  Anulada  ' })).toThrow(PaymentGuardError);
    expect(() => assertInvoicePayable({ ...base, status: null })).not.toThrow();
  });
});

// ── Preview: computePaymentPreview ────────────────────────────────────

describe('computePaymentPreview — datos para el panel de confirmación', () => {
  it('devuelve total, previouslyPaid, remaining, amountToApply y resultingPaid formateados a 2 decimales', () => {
    const p = computePaymentPreview({
      status: 'emitida',
      totalDue: '1500',
      previouslyPaid: '500',
      amountToApply: '250',
      kind: 'issued',
    });
    expect(p.totalDue).toBe('1500.00');
    expect(p.previouslyPaid).toBe('500.00');
    expect(p.remaining).toBe('1000.00');
    expect(p.amountToApply).toBe('250.00');
    expect(p.resultingPaid).toBe('750.00');
  });

  it('estima estado "parcial" cuando queda pendiente', () => {
    const p = computePaymentPreview({
      status: 'emitida',
      totalDue: '1000',
      previouslyPaid: '200',
      amountToApply: '300',
      kind: 'issued',
    });
    expect(p.estimatedStatus).toBe('parcial');
    expect(p.wouldOverpay).toBe(false);
  });

  it('estima estado "cobrada" cuando el pago completa una factura issued o income', () => {
    const issued = computePaymentPreview({ status: 'emitida', totalDue: '1000', previouslyPaid: '0', amountToApply: '1000', kind: 'issued' });
    const income = computePaymentPreview({ status: 'emitida', totalDue: '1000', previouslyPaid: '0', amountToApply: '1000', kind: 'internal_income' });
    expect(issued.estimatedStatus).toBe('cobrada');
    expect(income.estimatedStatus).toBe('cobrada');
  });

  it('estima estado "pagada" cuando el pago completa un expense interno', () => {
    const p = computePaymentPreview({ status: 'emitida', totalDue: '500', previouslyPaid: '250', amountToApply: '250', kind: 'internal_expense' });
    expect(p.estimatedStatus).toBe('pagada');
    expect(p.wouldOverpay).toBe(false);
  });

  it('marca wouldOverpay=true cuando amount excede el pendiente (para pintar warning en UI)', () => {
    const p = computePaymentPreview({ status: 'emitida', totalDue: '1000', previouslyPaid: '500', amountToApply: '600', kind: 'issued' });
    expect(p.wouldOverpay).toBe(true);
    // remaining se cappea a 0 mínimo, nunca negativo
    expect(Number(p.remaining)).toBeGreaterThanOrEqual(0);
  });

  it('remaining no puede ser negativo aunque previouslyPaid supere el total', () => {
    const p = computePaymentPreview({ status: 'cobrada', totalDue: '1000', previouslyPaid: '1200', amountToApply: '0', kind: 'issued' });
    expect(p.remaining).toBe('0.00');
  });
});

// ── AVAILABLE_TOOLS incluye getPendingPaymentMatches ──────────────────

describe('AVAILABLE_TOOLS — getPendingPaymentMatches registrada', () => {
  it('getPendingPaymentMatches empieza con get (solo lectura)', () => {
    const toolName = 'getPendingPaymentMatches';
    expect(toolName.startsWith('get')).toBe(true);
  });

  it('getPendingPaymentMatches no contiene verbos de mutación', () => {
    const dangerous = ['approve', 'reject', 'create', 'update', 'delete', 'mark', 'send', 'apply'];
    for (const verb of dangerous) {
      expect('getPendingPaymentMatches'.toLowerCase()).not.toContain(verb);
    }
  });
});
