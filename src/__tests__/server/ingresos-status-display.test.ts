/**
 * Contratos del helper `normalizeInvoiceStatusForDisplay` — mapping
 * visual del enum legacy `invoice_status` (12 valores, con duplicados)
 * a las 7 categorías canónicas para UI.
 *
 * NO modifica DB. Se cubre exhaustivamente porque el mapping es un
 * contrato con la sección /admin/finanzas/ingresos (PR 3).
 */

import {
  normalizeInvoiceStatusForDisplay,
  INVOICE_STATUS_DISPLAY_LABELS,
  INVOICE_STATUS_DISPLAY_SEMANTIC,
  type InvoiceStatusDisplay,
} from '@/lib/utils/invoice-status-display';

describe('[normalizeInvoiceStatusForDisplay] mapping canónico', () => {
  const cases: readonly [string, InvoiceStatusDisplay][] = [
    ['borrador', 'borrador'],
    ['emitida', 'emitida'],
    ['parcial', 'parcial'],
    ['cobrada', 'cobrada'],
    ['pagada', 'cobrada'],
    ['vencida', 'vencida'],
    ['anulada', 'cancelada'],
    ['pendiente', 'pendiente'],
    ['no_cobrada', 'pendiente'],
    ['no_cobrado', 'pendiente'],
    ['no_pagada', 'pendiente'],
    ['no_pagado', 'pendiente'],
  ];

  it.each(cases)('mapea "%s" → %s', (raw, expected) => {
    expect(normalizeInvoiceStatusForDisplay(raw)).toBe(expected);
  });

  it('trata mayúsculas y espacios sobrantes', () => {
    expect(normalizeInvoiceStatusForDisplay('  Cobrada  ')).toBe('cobrada');
    expect(normalizeInvoiceStatusForDisplay('EMITIDA')).toBe('emitida');
  });

  it('devuelve "pendiente" para null/undefined/vacío', () => {
    expect(normalizeInvoiceStatusForDisplay(null)).toBe('pendiente');
    expect(normalizeInvoiceStatusForDisplay(undefined)).toBe('pendiente');
    expect(normalizeInvoiceStatusForDisplay('')).toBe('pendiente');
  });

  it('devuelve "pendiente" para valores desconocidos', () => {
    expect(normalizeInvoiceStatusForDisplay('invented_status')).toBe('pendiente');
    expect(normalizeInvoiceStatusForDisplay('foo')).toBe('pendiente');
  });
});

describe('[status-display] labels y semánticas', () => {
  const DISPLAY_KEYS: readonly InvoiceStatusDisplay[] = [
    'borrador', 'emitida', 'parcial', 'cobrada', 'vencida', 'cancelada', 'pendiente',
  ];

  it('todas las categorías tienen label en español', () => {
    for (const k of DISPLAY_KEYS) {
      expect(INVOICE_STATUS_DISPLAY_LABELS[k]).toMatch(/^[A-ZÁÉÍÓÚ]/);
    }
  });

  it('todas las categorías tienen semantic válida', () => {
    const VALID = new Set(['positive', 'attention', 'negative', 'neutral']);
    for (const k of DISPLAY_KEYS) {
      expect(VALID.has(INVOICE_STATUS_DISPLAY_SEMANTIC[k])).toBe(true);
    }
  });

  it('cobrada es positive', () => {
    expect(INVOICE_STATUS_DISPLAY_SEMANTIC.cobrada).toBe('positive');
  });

  it('vencida es negative', () => {
    expect(INVOICE_STATUS_DISPLAY_SEMANTIC.vencida).toBe('negative');
  });

  it('emitida/parcial/pendiente son attention (requieren acción)', () => {
    expect(INVOICE_STATUS_DISPLAY_SEMANTIC.emitida).toBe('attention');
    expect(INVOICE_STATUS_DISPLAY_SEMANTIC.parcial).toBe('attention');
    expect(INVOICE_STATUS_DISPLAY_SEMANTIC.pendiente).toBe('attention');
  });
});
