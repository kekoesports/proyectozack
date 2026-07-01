/**
 * Tests para la lógica pura del resumen económico V2.
 *
 * Cubre:
 *   - classifyResumenSection (4 secciones)
 *   - aggregateNominas (Pablo/Alfonso/otros/total/count)
 *   - aggregateImpuestos (5 sub-buckets + total + count)
 *   - aggregateOperativos (8 sub-buckets + hosting_dominio + sinClasificar)
 *   - computeResultadoOperativo (fórmula caja)
 *   - daysOverdue (nulls, fecha vencida, no vencida)
 *   - topNPendientes (orden, total, count, top-5)
 *   - computeMargenPendienteEstimado
 *   - assemblePendientes (integración)
 *   - Estáticos: query server-only, tipos, no `paidAmount` en SELECT
 *   - Anti-scope-creep: sin schema/cron/Resend/emails
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  aggregateImpuestos,
  aggregateNominas,
  aggregateOperativos,
  assemblePendientes,
  classifyResumenSection,
  computeMargenPendienteEstimado,
  computeResultadoOperativo,
  daysOverdue,
  round2,
  topNPendientes,
  type ExpenseRow,
} from '@/lib/queries/financeDashboard/finanzasResumenV2.shared';
import type { PendienteItem } from '@/types/finanzasResumen';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

function makeExpense(overrides: Partial<ExpenseRow>): ExpenseRow {
  return {
    totalAmount: 0,
    expenseGroup: null,
    expenseSubtype: null,
    concept: null,
    counterpartyName: null,
    ...overrides,
  };
}

function makeItem(overrides: Partial<PendienteItem>): PendienteItem {
  return {
    id: 1,
    source: 'issued',
    label: 'x',
    amount: 0,
    dueDate: null,
    daysOverdue: null,
    ...overrides,
  };
}

// ── round2 ────────────────────────────────────────────────────────────────

describe('round2()', () => {
  it('redondea a 2 decimales', () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.235)).toBe(1.24);
    expect(round2(0)).toBe(0);
  });
});

// ── classifyResumenSection ────────────────────────────────────────────────

describe('classifyResumenSection()', () => {
  it('nomina_socio → nominas', () => {
    expect(classifyResumenSection({ expenseGroup: 'operational', expenseSubtype: 'nomina_socio' })).toBe('nominas');
  });

  it('cuota_autonomo → impuestos', () => {
    expect(classifyResumenSection({ expenseGroup: 'operational', expenseSubtype: 'cuota_autonomo' })).toBe('impuestos');
  });

  it('factura_autonomo → impuestos', () => {
    expect(classifyResumenSection({ expenseGroup: 'operational', expenseSubtype: 'factura_autonomo' })).toBe('impuestos');
  });

  it('seguridad_social → impuestos', () => {
    expect(classifyResumenSection({ expenseGroup: 'operational', expenseSubtype: 'seguridad_social' })).toBe('impuestos');
  });

  it('fiscal_impuestos → impuestos', () => {
    expect(classifyResumenSection({ expenseGroup: 'operational', expenseSubtype: 'fiscal_impuestos' })).toBe('impuestos');
  });

  it('ajuste_fiscal → impuestos', () => {
    expect(classifyResumenSection({ expenseGroup: 'operational', expenseSubtype: 'ajuste_fiscal' })).toBe('impuestos');
  });

  it('campaign_direct + pago_talento → costes_directos', () => {
    expect(classifyResumenSection({ expenseGroup: 'campaign_direct', expenseSubtype: 'pago_talento' })).toBe('costes_directos');
  });

  it('campaign_direct sin subtype → costes_directos', () => {
    expect(classifyResumenSection({ expenseGroup: 'campaign_direct', expenseSubtype: null })).toBe('costes_directos');
  });

  it('operational + gestoria → operativos', () => {
    expect(classifyResumenSection({ expenseGroup: 'operational', expenseSubtype: 'gestoria' })).toBe('operativos');
  });

  it('null + null → operativos (sin clasificar cae aquí)', () => {
    expect(classifyResumenSection({ expenseGroup: null, expenseSubtype: null })).toBe('operativos');
  });
});

// ── aggregateNominas ──────────────────────────────────────────────────────

describe('aggregateNominas()', () => {
  it('sin filas devuelve todo a 0', () => {
    const n = aggregateNominas([]);
    expect(n.pablo).toBe(0);
    expect(n.alfonso).toBe(0);
    expect(n.otros).toBe(0);
    expect(n.total).toBe(0);
    expect(n.count).toBe(0);
  });

  it('separa Pablo por concept/counterparty', () => {
    const n = aggregateNominas([
      makeExpense({ expenseSubtype: 'nomina_socio', totalAmount: 1696.55, counterpartyName: 'CAMACHO CARRION PABLO' }),
      makeExpense({ expenseSubtype: 'nomina_socio', totalAmount: 1696.55, counterpartyName: 'CAMACHO CARRION PABLO' }),
    ]);
    expect(n.pablo).toBe(3393.10);
    expect(n.alfonso).toBe(0);
    expect(n.count).toBe(2);
  });

  it('separa Alfonso por concept/counterparty', () => {
    const n = aggregateNominas([
      makeExpense({ expenseSubtype: 'nomina_socio', totalAmount: 1369, counterpartyName: 'ARIAS EPIFANIO ALFONSO' }),
    ]);
    expect(n.alfonso).toBe(1369);
    expect(n.pablo).toBe(0);
  });

  it('sin persona detectable → otros', () => {
    const n = aggregateNominas([
      makeExpense({ expenseSubtype: 'nomina_socio', totalAmount: 500, counterpartyName: null, concept: 'Nómina genérica' }),
    ]);
    expect(n.otros).toBe(500);
    expect(n.pablo).toBe(0);
    expect(n.alfonso).toBe(0);
  });

  it('ignora filas que no son nomina_socio', () => {
    const n = aggregateNominas([
      makeExpense({ expenseSubtype: 'gestoria', totalAmount: 999 }),
      makeExpense({ expenseSubtype: 'nomina_socio', totalAmount: 1000, counterpartyName: 'ALFONSO' }),
    ]);
    expect(n.total).toBe(1000);
    expect(n.count).toBe(1);
  });

  it('total = pablo + alfonso + otros', () => {
    const n = aggregateNominas([
      makeExpense({ expenseSubtype: 'nomina_socio', totalAmount: 100, counterpartyName: 'PABLO' }),
      makeExpense({ expenseSubtype: 'nomina_socio', totalAmount: 200, counterpartyName: 'ALFONSO' }),
      makeExpense({ expenseSubtype: 'nomina_socio', totalAmount: 50 }),
    ]);
    expect(n.total).toBe(350);
  });
});

// ── aggregateImpuestos ────────────────────────────────────────────────────

describe('aggregateImpuestos()', () => {
  it('split Pablo/Alfonso/otros en cuota_autonomo', () => {
    const i = aggregateImpuestos([
      makeExpense({ expenseSubtype: 'cuota_autonomo', totalAmount: 315, concept: 'Cuota de autónomo — Pablo' }),
      makeExpense({ expenseSubtype: 'cuota_autonomo', totalAmount: 315, concept: 'Cuota de autónomo — Alfonso' }),
      makeExpense({ expenseSubtype: 'cuota_autonomo', totalAmount: 315, concept: 'Cuota autónomo' }),
    ]);
    expect(i.cuotaAutonomoPablo).toBe(315);
    expect(i.cuotaAutonomoAlfonso).toBe(315);
    expect(i.cuotaAutonomoOtros).toBe(315);
    expect(i.count).toBe(3);
    expect(i.total).toBe(945);
  });

  it('factura_autonomo también participa del split', () => {
    const i = aggregateImpuestos([
      makeExpense({ expenseSubtype: 'factura_autonomo', totalAmount: 200, counterpartyName: 'RETA Pablo García' }),
    ]);
    expect(i.cuotaAutonomoPablo).toBe(200);
  });

  it('seguridad_social va a su propio bucket', () => {
    const i = aggregateImpuestos([
      makeExpense({ expenseSubtype: 'seguridad_social', totalAmount: 500 }),
    ]);
    expect(i.seguridadSocial).toBe(500);
    expect(i.total).toBe(500);
  });

  it('fiscal_impuestos + ajuste_fiscal → fiscal', () => {
    const i = aggregateImpuestos([
      makeExpense({ expenseSubtype: 'fiscal_impuestos', totalAmount: 300 }),
      makeExpense({ expenseSubtype: 'ajuste_fiscal', totalAmount: 50 }),
    ]);
    expect(i.fiscal).toBe(350);
  });

  it('ignora filas no-impuestos', () => {
    const i = aggregateImpuestos([
      makeExpense({ expenseSubtype: 'gestoria', totalAmount: 185 }),
    ]);
    expect(i.total).toBe(0);
    expect(i.count).toBe(0);
  });
});

// ── aggregateOperativos ───────────────────────────────────────────────────

describe('aggregateOperativos()', () => {
  it('categoriza cada subtype operational en su bucket', () => {
    const o = aggregateOperativos([
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'gestoria',            totalAmount: 185 }),
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'suscripcion_software', totalAmount: 20, concept: 'ChatGPT' }),
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'herramienta_ia',       totalAmount: 15, concept: 'Claude' }),
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'seguro_medico',        totalAmount: 54 }),
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'comision_bancaria',    totalAmount: 3.50 }),
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'comision_plataforma',  totalAmount: 1 }),
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'marketing_publicidad', totalAmount: 100 }),
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'gasto_general',        totalAmount: 40 }),
    ]);
    expect(o.gestoria).toBe(185);
    expect(o.softwareIa).toBe(35);
    expect(o.seguroMedico).toBe(54);
    expect(o.comisiones).toBe(4.50);
    expect(o.marketing).toBe(100);
    expect(o.otros).toBe(40);
    expect(o.count).toBe(8);
    expect(o.total).toBe(round2(185 + 35 + 54 + 4.5 + 100 + 40));
  });

  it('detecta hosting/dominio en subtypes candidatos', () => {
    const o = aggregateOperativos([
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'suscripcion_software', totalAmount: 20, concept: 'Vercel Pro' }),
      makeExpense({ expenseGroup: 'operational', expenseSubtype: 'gasto_general',        totalAmount: 15, counterpartyName: 'Cloudflare' }),
      makeExpense({ expenseGroup: 'operational', expenseSubtype: null,                    totalAmount: 8,  concept: 'Namecheap DNS' }),
    ]);
    expect(o.hostingDominio).toBe(43);
    expect(o.softwareIa).toBe(0);
  });

  it('operational sin subtype conocido → otros (no sinClasificar)', () => {
    const o = aggregateOperativos([
      makeExpense({ expenseGroup: 'operational', expenseSubtype: null, totalAmount: 30 }),
    ]);
    expect(o.otros).toBe(30);
    expect(o.sinClasificar).toBe(0);
  });

  it('sin group y sin subtype → sinClasificar (bucket amber)', () => {
    const o = aggregateOperativos([
      makeExpense({ expenseGroup: null, expenseSubtype: null, totalAmount: 100 }),
    ]);
    expect(o.sinClasificar).toBe(100);
    expect(o.total).toBe(100);
  });

  it('ignora nóminas, impuestos y costes directos', () => {
    const o = aggregateOperativos([
      makeExpense({ expenseGroup: 'operational',     expenseSubtype: 'nomina_socio',  totalAmount: 1000 }),
      makeExpense({ expenseGroup: 'operational',     expenseSubtype: 'cuota_autonomo', totalAmount: 315 }),
      makeExpense({ expenseGroup: 'campaign_direct', expenseSubtype: 'pago_talento',  totalAmount: 500 }),
      makeExpense({ expenseGroup: 'operational',     expenseSubtype: 'gestoria',       totalAmount: 185 }),
    ]);
    expect(o.gestoria).toBe(185);
    expect(o.total).toBe(185);
    expect(o.count).toBe(1);
  });
});

// ── computeResultadoOperativo ─────────────────────────────────────────────

describe('computeResultadoOperativo()', () => {
  it('operativo = margenBrutoCobrado - nominas - impuestos - operativos', () => {
    const r = computeResultadoOperativo({
      margenBrutoCobrado: 10_000,
      nominasTotal:        4_000,
      impuestosTotal:      1_000,
      operativosTotal:     2_000,
    });
    expect(r.operativo).toBe(3_000);
  });

  it('resultado negativo se preserva', () => {
    const r = computeResultadoOperativo({
      margenBrutoCobrado: 1_000,
      nominasTotal:        2_000,
      impuestosTotal:      500,
      operativosTotal:     500,
    });
    expect(r.operativo).toBe(-2_000);
  });
});

// ── daysOverdue ───────────────────────────────────────────────────────────

describe('daysOverdue()', () => {
  it('null cuando no hay dueDate', () => {
    expect(daysOverdue('2026-07-01', null)).toBeNull();
  });

  it('positivo cuando la factura está vencida', () => {
    expect(daysOverdue('2026-07-15', '2026-07-10')).toBe(5);
  });

  it('cero cuando vence hoy', () => {
    expect(daysOverdue('2026-07-10', '2026-07-10')).toBe(0);
  });

  it('negativo cuando aún no vence', () => {
    expect(daysOverdue('2026-07-01', '2026-07-10')).toBe(-9);
  });
});

// ── topNPendientes ────────────────────────────────────────────────────────

describe('topNPendientes()', () => {
  it('ordena DESC por amount y devuelve top 5', () => {
    const items: PendienteItem[] = [
      makeItem({ id: 1, amount: 100 }),
      makeItem({ id: 2, amount: 500 }),
      makeItem({ id: 3, amount: 300 }),
      makeItem({ id: 4, amount: 200 }),
      makeItem({ id: 5, amount: 400 }),
      makeItem({ id: 6, amount: 50  }),
    ];
    const b = topNPendientes(items);
    expect(b.top.map((i) => i.id)).toEqual([2, 5, 3, 4, 1]);
    expect(b.total).toBe(1550);
    expect(b.count).toBe(6);
  });

  it('n personalizado', () => {
    const b = topNPendientes([
      makeItem({ id: 1, amount: 10 }),
      makeItem({ id: 2, amount: 20 }),
    ], 1);
    expect(b.top).toHaveLength(1);
    expect(b.top[0]?.id).toBe(2);
  });

  it('lista vacía → total=0, top=[]', () => {
    const b = topNPendientes([]);
    expect(b.total).toBe(0);
    expect(b.top).toEqual([]);
  });
});

// ── computeMargenPendienteEstimado ────────────────────────────────────────

describe('computeMargenPendienteEstimado()', () => {
  it('cobros pendientes - pagos talento pendientes', () => {
    expect(computeMargenPendienteEstimado(2100, 1100)).toBe(1000);
  });

  it('puede ser negativo si pagamos más de lo que cobramos', () => {
    expect(computeMargenPendienteEstimado(500, 800)).toBe(-300);
  });
});

// ── assemblePendientes (integración) ──────────────────────────────────────

describe('assemblePendientes()', () => {
  it('junta 3 buckets + margen pendiente estimado', () => {
    const p = assemblePendientes({
      cobrosCampanas: [makeItem({ id: 1, amount: 1600 }), makeItem({ id: 2, amount: 500 })],
      pagosTalento:   [makeItem({ id: 3, amount: 900 }),  makeItem({ id: 4, amount: 200 })],
      pagosOperativo: [makeItem({ id: 5, amount: 185 })],
    });
    expect(p.cobrosCampanas.total).toBe(2100);
    expect(p.pagosTalento.total).toBe(1100);
    expect(p.pagosOperativo.total).toBe(185);
    expect(p.margenPendienteEstimado).toBe(1000);
  });
});

// ── Chequeos estáticos ────────────────────────────────────────────────────

describe('finanzasResumenV2 — chequeos estáticos', () => {
  const querySrc = read('src/lib/queries/financeDashboard/finanzasResumenV2.ts');
  const sharedSrc = read('src/lib/queries/financeDashboard/finanzasResumenV2.shared.ts');
  const typesSrc = read('src/types/finanzasResumen.ts');

  it('query.ts declara "server-only"', () => {
    expect(querySrc).toMatch(/^['"]server-only['"];/m);
  });

  it('shared.ts NO declara server-only (para permitir tests + reuse en client si hiciera falta)', () => {
    expect(sharedSrc).not.toMatch(/^['"]server-only['"];/m);
  });

  it('query no lee invoices.paidAmount deprecated', () => {
    // Se permite `paidAmount:` como alias local en SELECTs (calculado via SUM(invoice_payments)),
    // pero NUNCA `invoices.paidAmount` como fuente. Filtramos líneas que sean
    // documentación (empiezan por *) para no falsear con menciones en JSDoc.
    const codeOnly = querySrc
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
      .join('\n');
    expect(codeOnly).not.toMatch(/invoices\.paidAmount/);
  });

  it('query usa invoice_payments como fuente canónica de cobros/pagos', () => {
    expect(querySrc).toMatch(/invoicePayments\b/);
    expect(querySrc).toMatch(/SUM\(\$\{invoicePayments\.amount\}\)/);
  });

  it('tipos de root incluyen los 9 bloques esperados', () => {
    for (const key of [
      'period', 'ingresos', 'costesDirectos', 'margenBruto',
      'nominas', 'impuestos', 'operativos', 'resultado', 'pendientes',
    ]) {
      expect(typesSrc).toMatch(new RegExp(`readonly ${key}:`));
    }
  });
});

// ── Anti-scope-creep ──────────────────────────────────────────────────────

describe('finanzasResumenV2 — anti-scope-creep', () => {
  const files = [
    'src/lib/queries/financeDashboard/finanzasResumenV2.ts',
    'src/lib/queries/financeDashboard/finanzasResumenV2.shared.ts',
    'src/types/finanzasResumen.ts',
  ];

  it.each(files)('%s no importa Resend/emails/dunning/invoice_reminders', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/from\s+['"]resend['"]/);
    expect(src).not.toMatch(/@\/lib\/email/);
    expect(src).not.toMatch(/sendEmail/);
    expect(src).not.toMatch(/invoice_reminders/);
    expect(src).not.toMatch(/invoiceReminders/);
    expect(src).not.toMatch(/dunning/i);
  });

  it.each(files)('%s no define ni altera tablas', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/pgTable\s*\(/);
    expect(src).not.toMatch(/alterTable/);
  });
});
