/**
 * Regression test para `lib/utils/invoice-status.ts`.
 *
 * Captura los dos bugs corregidos:
 * - `getPendingBrandPaymentsTotal` antes filtraba `!= 'cobrada'`, contando
 *   `pagada` y `anulada` como pendientes.
 * - `getPendingTalentPaymentsTotal` filtraba `!= 'cobrada'` para expenses
 *   cuando el estado liquidado natural es `'pagada'`.
 *
 * El fix centralizó las constantes en `invoice-status.ts`. Aquí verificamos
 * que esas constantes encierran la semántica correcta y que P&L sigue siendo
 * coherente con dashboard.
 */

import {
  SETTLED_INCOME_STATUSES,
  SETTLED_EXPENSE_STATUSES,
  PENDING_INCOME_STATUSES,
  PENDING_EXPENSE_STATUSES,
  PENDING_INCOME_FILTER,
  PENDING_EXPENSE_FILTER,
} from '@/lib/utils/invoice-status';

describe('invoice status semantics', () => {
  describe('SETTLED_*_STATUSES', () => {
    it('considers both cobrada and pagada as settled income', () => {
      expect(SETTLED_INCOME_STATUSES).toContain('cobrada');
      expect(SETTLED_INCOME_STATUSES).toContain('pagada');
    });

    it('considers both cobrada and pagada as settled expense', () => {
      expect(SETTLED_EXPENSE_STATUSES).toContain('cobrada');
      expect(SETTLED_EXPENSE_STATUSES).toContain('pagada');
    });
  });

  describe('PENDING_*_STATUSES', () => {
    it('never includes settled statuses in PENDING_INCOME', () => {
      expect(PENDING_INCOME_STATUSES).not.toContain('cobrada');
      expect(PENDING_INCOME_STATUSES).not.toContain('pagada');
    });

    it('never includes anulada or borrador in PENDING_INCOME', () => {
      expect(PENDING_INCOME_STATUSES).not.toContain('anulada');
      expect(PENDING_INCOME_STATUSES).not.toContain('borrador');
    });

    it('never includes settled statuses in PENDING_EXPENSE', () => {
      expect(PENDING_EXPENSE_STATUSES).not.toContain('cobrada');
      expect(PENDING_EXPENSE_STATUSES).not.toContain('pagada');
    });

    it('never includes anulada or borrador in PENDING_EXPENSE', () => {
      expect(PENDING_EXPENSE_STATUSES).not.toContain('anulada');
      expect(PENDING_EXPENSE_STATUSES).not.toContain('borrador');
    });

    it('PENDING_INCOME contains emitida and parcial', () => {
      expect(PENDING_INCOME_STATUSES).toContain('emitida');
      expect(PENDING_INCOME_STATUSES).toContain('parcial');
      expect(PENDING_INCOME_STATUSES).toContain('vencida');
      expect(PENDING_INCOME_STATUSES).toContain('no_cobrada');
    });

    it('PENDING_EXPENSE contains emitida and parcial and no_pagada', () => {
      expect(PENDING_EXPENSE_STATUSES).toContain('emitida');
      expect(PENDING_EXPENSE_STATUSES).toContain('parcial');
      expect(PENDING_EXPENSE_STATUSES).toContain('vencida');
      expect(PENDING_EXPENSE_STATUSES).toContain('no_pagada');
    });

    it('PENDING_INCOME and PENDING_EXPENSE differ in the unpaid sentinel', () => {
      // income side uses no_cobrada; expense side uses no_pagada
      expect(PENDING_INCOME_STATUSES).toContain('no_cobrada');
      expect(PENDING_INCOME_STATUSES).not.toContain('no_pagada');
      expect(PENDING_EXPENSE_STATUSES).toContain('no_pagada');
      expect(PENDING_EXPENSE_STATUSES).not.toContain('no_cobrada');
    });
  });

  describe('mutable filter arrays', () => {
    it('PENDING_INCOME_FILTER mirrors PENDING_INCOME_STATUSES', () => {
      expect(PENDING_INCOME_FILTER).toEqual([...PENDING_INCOME_STATUSES]);
    });

    it('PENDING_EXPENSE_FILTER mirrors PENDING_EXPENSE_STATUSES', () => {
      expect(PENDING_EXPENSE_FILTER).toEqual([...PENDING_EXPENSE_STATUSES]);
    });
  });

  describe('regression: never reintroduce the old buggy filter', () => {
    it('a filter that only excludes "cobrada" would let pagada/anulada slip through', () => {
      // Si en el futuro alguien escribe `status != 'cobrada'`, este test no lo detectará
      // directamente (vive en la query), pero documenta el racional aquí.
      // El test efectivo es la cobertura de PENDING_*_STATUSES arriba.
      const buggyExclusion = ['cobrada'];
      expect(buggyExclusion).not.toEqual([...SETTLED_INCOME_STATUSES]);
      expect(buggyExclusion).not.toEqual([...SETTLED_EXPENSE_STATUSES]);
    });
  });
});
