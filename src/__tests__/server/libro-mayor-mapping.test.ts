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
  it('resuelve cuenta 43000299 → clientes', () => {
    const m = resolveAccountMapping('43000299');
    expect(m?.category).toContain('Clientes');
    expect(m?.crmEntity).toBe('invoice');
    expect(m?.critical).toBe(true);
  });

  it('resuelve cuenta 41005140 → proveedores', () => {
    const m = resolveAccountMapping('41005140');
    expect(m?.category).toContain('Proveedores');
    expect(m?.crmEntity).toBe('expense');
    expect(m?.critical).toBe(true);
  });

  it('resuelve cuenta 57200001 → bancos', () => {
    const m = resolveAccountMapping('57200001');
    expect(m?.category).toContain('Bancos');
    expect(m?.crmEntity).toBe('bank_movement');
    expect(m?.critical).toBe(true);
  });

  it('resuelve cuenta 64000000 → sueldos y salarios', () => {
    const m = resolveAccountMapping('64000000');
    expect(m?.category).toContain('Sueldos');
    expect(m?.crmEntity).toBe('payroll');
  });

  it('resuelve cuenta 55500000 → partidas pendientes de aplicación', () => {
    const m = resolveAccountMapping('55500000');
    expect(m?.category).toContain('Partidas pendientes');
    expect(m?.critical).toBe(true);
  });

  it('resuelve cuenta 70500001 → ingresos por servicios', () => {
    const m = resolveAccountMapping('70500001');
    expect(m?.category).toContain('Ingresos');
    expect(m?.crmEntity).toBe('invoice');
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
