import {
  normalizeExpenseStatusForDisplay,
  EXPENSE_STATUS_DISPLAY_LABELS,
  EXPENSE_STATUS_DISPLAY_SEMANTIC,
  type ExpenseStatusDisplay,
} from '@/lib/utils/expense-status-display';

describe('[expense-status-display] mapping canónico', () => {
  const cases: readonly [string, ExpenseStatusDisplay][] = [
    ['pagada', 'pagado'],
    ['pagado', 'pagado'],
    ['cobrada', 'pagado'], // legacy: algunos gastos marcados como cobrada
    ['parcial', 'parcial'],
    ['vencida', 'vencido'],
    ['anulada', 'cancelado'],
    ['pendiente', 'pendiente'],
    ['no_pagada', 'pendiente'],
    ['no_pagado', 'pendiente'],
    ['no_cobrada', 'pendiente'],
    ['no_cobrado', 'pendiente'],
    ['borrador', 'pendiente'],
    ['emitida', 'pendiente'],
  ];

  it.each(cases)('mapea "%s" → %s', (raw, expected) => {
    expect(normalizeExpenseStatusForDisplay(raw)).toBe(expected);
  });

  it('devuelve "pendiente" para null/undefined/vacío/desconocido', () => {
    expect(normalizeExpenseStatusForDisplay(null)).toBe('pendiente');
    expect(normalizeExpenseStatusForDisplay(undefined)).toBe('pendiente');
    expect(normalizeExpenseStatusForDisplay('')).toBe('pendiente');
    expect(normalizeExpenseStatusForDisplay('foo')).toBe('pendiente');
  });

  it('todas las categorías tienen label y semantic', () => {
    const KEYS: readonly ExpenseStatusDisplay[] = ['pagado', 'parcial', 'pendiente', 'vencido', 'cancelado'];
    for (const k of KEYS) {
      expect(EXPENSE_STATUS_DISPLAY_LABELS[k]).toMatch(/^[A-Z]/);
      expect(['positive', 'attention', 'negative', 'neutral']).toContain(EXPENSE_STATUS_DISPLAY_SEMANTIC[k]);
    }
  });

  it('semánticas críticas', () => {
    expect(EXPENSE_STATUS_DISPLAY_SEMANTIC.pagado).toBe('positive');
    expect(EXPENSE_STATUS_DISPLAY_SEMANTIC.vencido).toBe('negative');
    expect(EXPENSE_STATUS_DISPLAY_SEMANTIC.pendiente).toBe('attention');
  });
});
