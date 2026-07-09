/**
 * Tests del mapping de cuentas PGC → categorías CRM.
 */

import { ACCOUNT_MAP, PGC_GROUPS } from '@/features/libro-mayor/mapping/account-map';
import { resolveAccountMapping, resolvePgcGroup, categoryLabel } from '@/features/libro-mayor/mapping/resolve-category';

describe('ACCOUNT_MAP — prefijos únicos', () => {
  it('no hay prefijos duplicados', () => {
    const prefixes = ACCOUNT_MAP.map((m) => m.prefix);
    const set = new Set(prefixes);
    expect(set.size).toBe(prefixes.length);
  });

  it('todos los prefijos son 3 dígitos', () => {
    for (const m of ACCOUNT_MAP) {
      expect(m.prefix).toMatch(/^\d{3}$/);
    }
  });

  it('marca críticas: 430, 410, 465, 555, 570, 572, 640, 705', () => {
    const critical = ACCOUNT_MAP.filter((m) => m.critical).map((m) => m.prefix);
    for (const p of ['430', '410', '465', '555', '570', '572', '640', '705']) {
      expect(critical).toContain(p);
    }
  });
});

describe('resolveAccountMapping', () => {
  it('resuelve cuenta 43000299 → clientes (invoice_income)', () => {
    const m = resolveAccountMapping('43000299');
    expect(m?.category).toContain('Clientes');
    expect(m?.crmEntity).toBe('invoice_income');
    expect(m?.critical).toBe(true);
  });

  it('resuelve cuenta 41005140 → proveedores (invoice_expense)', () => {
    const m = resolveAccountMapping('41005140');
    expect(m?.category).toContain('Proveedores');
    expect(m?.crmEntity).toBe('invoice_expense');
    expect(m?.critical).toBe(true);
  });

  it('resuelve cuenta 57200001 → bancos (bank_transaction)', () => {
    const m = resolveAccountMapping('57200001');
    expect(m?.category).toContain('Bancos');
    expect(m?.crmEntity).toBe('bank_transaction');
    expect(m?.critical).toBe(true);
  });

  it('resuelve cuenta 64000000 → sueldos (invoice_payroll + subtype nomina_socio)', () => {
    const m = resolveAccountMapping('64000000');
    expect(m?.category).toContain('Sueldos');
    expect(m?.crmEntity).toBe('invoice_payroll');
    expect(m?.crmExpenseSubtype).toBe('nomina_socio');
  });

  it('resuelve cuenta 55500000 → partidas pendientes de aplicación', () => {
    const m = resolveAccountMapping('55500000');
    expect(m?.category).toContain('Partidas pendientes');
    expect(m?.critical).toBe(true);
  });

  it('resuelve cuenta 70500001 → ingresos por servicios (invoice_income)', () => {
    const m = resolveAccountMapping('70500001');
    expect(m?.category).toContain('Ingresos');
    expect(m?.crmEntity).toBe('invoice_income');
  });

  it('cuenta 465 (remuneraciones pendientes) apunta a expenseSubtype=nomina_socio', () => {
    const m = resolveAccountMapping('46500000');
    expect(m?.crmEntity).toBe('invoice_payroll');
    expect(m?.crmExpenseSubtype).toBe('nomina_socio');
  });

  it('cuenta 623 (servicios profesionales) apunta a expenseSubtype=gestoria', () => {
    const m = resolveAccountMapping('62300000');
    expect(m?.crmExpenseSubtype).toBe('gestoria');
  });

  it('cuenta 629 (otros servicios) apunta a expenseSubtype=suscripcion_software', () => {
    const m = resolveAccountMapping('62900000');
    expect(m?.crmExpenseSubtype).toBe('suscripcion_software');
  });

  it('devuelve null para prefijo desconocido', () => {
    expect(resolveAccountMapping('99999999')).toBeNull();
    expect(resolveAccountMapping('AB123456')).toBeNull();
  });

  it('devuelve null para código vacío o demasiado corto', () => {
    expect(resolveAccountMapping('')).toBeNull();
    expect(resolveAccountMapping('12')).toBeNull();
  });
});

describe('resolvePgcGroup', () => {
  it('resuelve grupo 4 para cuenta 43000001', () => {
    const g = resolvePgcGroup('43000001');
    expect(g?.code).toBe('4');
    expect(g?.name).toBe(PGC_GROUPS['4']);
  });

  it('resuelve grupo 7 para cuenta 70500001', () => {
    const g = resolvePgcGroup('70500001');
    expect(g?.code).toBe('7');
  });

  it('devuelve null para código no numérico', () => {
    expect(resolvePgcGroup('ABCD1234')).toBeNull();
    expect(resolvePgcGroup('')).toBeNull();
  });
});

describe('categoryLabel', () => {
  it('devuelve "Sin categoría" para código desconocido', () => {
    expect(categoryLabel('99999999')).toBe('Sin categoría');
  });

  it('devuelve categoría para código conocido', () => {
    expect(categoryLabel('43000001')).toContain('Clientes');
  });
});

describe('CrmEntity — compatibilidad con arquitectura real del CRM', () => {
  it('todos los crmEntity son de la unión declarada (no invoice/expense/payroll legacy)', () => {
    const allowed = new Set(['invoice_income', 'invoice_expense', 'invoice_payroll', 'bank_transaction', 'internal']);
    for (const m of ACCOUNT_MAP) {
      expect(allowed.has(m.crmEntity)).toBe(true);
    }
  });

  it('ninguna cuenta apunta a entidades inexistentes (expenses/payrolls como tablas separadas)', () => {
    // El CRM real NO tiene tabla `expenses` ni `payrolls` — todo es `invoices`.
    // Este test defiende contra reintroducción del enum legacy sin verificar realidad.
    for (const m of ACCOUNT_MAP) {
      expect((m.crmEntity as string)).not.toBe('expense');
      expect((m.crmEntity as string)).not.toBe('payroll');
      expect((m.crmEntity as string)).not.toBe('bank_movement');
      expect((m.crmEntity as string)).not.toBe('invoice');
    }
  });

  it('crmExpenseSubtype cuando presente coincide con expenseSubtypeEnum del CRM', () => {
    // Los valores válidos de expenseSubtype en src/db/schema/invoices.ts.
    // Este test defiende contra typos y drift entre mapping y schema real.
    const validSubtypes = new Set([
      'pago_talento', 'coste_produccion', 'comision_plataforma', 'otros_campana',
      'suscripcion_software', 'herramienta_ia', 'gestoria', 'fiscal_impuestos',
      'cuota_autonomo', 'marketing_publicidad', 'comision_bancaria', 'ajuste_fiscal',
      'gasto_general', 'factura_autonomo', 'nomina_socio', 'seguro_medico',
      'seguridad_social',
    ]);
    for (const m of ACCOUNT_MAP) {
      if (m.crmExpenseSubtype !== undefined) {
        expect(validSubtypes.has(m.crmExpenseSubtype)).toBe(true);
      }
    }
  });
});
