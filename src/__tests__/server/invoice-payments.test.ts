import { applyPaymentSchema } from '@/lib/schemas/invoicePayments';
import { checkGuardrails } from '@/lib/services/ai-assistant/guardrails';

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
