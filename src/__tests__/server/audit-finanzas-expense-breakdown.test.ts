/**
 * Tests para el desglose visual anual de gastos.
 *
 * Cubre:
 *   - Clasificador puro (`classifyExpenseSubgroup`): 17 subgrupos + guardarraíles.
 *   - Agregación (`summarizeExpenseSubgroups`): pct, orden DESC, edge cases.
 *   - Estáticos: page.tsx renderiza el bloque; getFinancePnL expone `expenseBySubgroup`.
 *   - Anti-scope-creep: sin schema/migrations/cron/Resend/emails.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  classifyExpenseSubgroup,
  detectPartner,
  summarizeExpenseSubgroups,
  EXPENSE_SUBGROUP_LABELS,
  type ExpenseClassifierInput,
  type ExpenseSubgroupKey,
} from '@/lib/queries/financeDashboard/expenseSubgroups';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

function makeInput(overrides: Partial<ExpenseClassifierInput>): ExpenseClassifierInput {
  return {
    expenseGroup: null,
    expenseSubtype: null,
    concept: null,
    counterpartyName: null,
    ...overrides,
  };
}

// ── Detección de socio ─────────────────────────────────────────────────────

describe('detectPartner()', () => {
  it('reconoce Pablo por nombre', () => {
    expect(detectPartner('Nómina Pablo julio')).toBe('pablo');
    expect(detectPartner('CAMACHO CARRION PABLO')).toBe('pablo');
    expect(detectPartner('RETA Pablo García')).toBe('pablo');
    expect(detectPartner('Cuota autónomo Keko')).toBe('pablo');
  });

  it('reconoce Alfonso por nombre', () => {
    expect(detectPartner('Nómina Alfonso agosto')).toBe('alfonso');
    expect(detectPartner('ARIAS EPIFANIO ALFONSO')).toBe('alfonso');
    expect(detectPartner('RETA Alfonso')).toBe('alfonso');
  });

  it('devuelve null si no hay señal', () => {
    expect(detectPartner('Cuota autónomo')).toBeNull();
    expect(detectPartner('')).toBeNull();
    expect(detectPartner('Gestoría trimestre')).toBeNull();
  });

  it('devuelve null si aparecen ambos (ambiguo, conservador)', () => {
    expect(detectPartner('Pago Pablo y Alfonso conjunto')).toBeNull();
  });
});

// ── Clasificador por subtipo ───────────────────────────────────────────────

describe('classifyExpenseSubgroup()', () => {
  describe('Nóminas (partner-aware)', () => {
    it('nomina_socio + Pablo → nomina_pablo', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'nomina_socio',
        concept: 'Nómina julio 2026',
        counterpartyName: 'CAMACHO CARRION PABLO',
      }))).toBe('nomina_pablo');
    });

    it('nomina_socio + Camacho en concept → nomina_pablo', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'nomina_socio',
        concept: 'Nómina Camacho jul',
      }))).toBe('nomina_pablo');
    });

    it('nomina_socio + Keko → nomina_pablo', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'nomina_socio',
        counterpartyName: 'Nómina Keko',
      }))).toBe('nomina_pablo');
    });

    it('nomina_socio + Alfonso → nomina_alfonso', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'nomina_socio',
        counterpartyName: 'ARIAS EPIFANIO ALFONSO',
      }))).toBe('nomina_alfonso');
    });

    it('nomina_socio sin persona → nomina_otros', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'nomina_socio',
        concept: 'Nómina genérica',
      }))).toBe('nomina_otros');
    });

    it('nomina_socio con ambigüedad Pablo + Alfonso → nomina_otros', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'nomina_socio',
        concept: 'Reparto nóminas Pablo y Alfonso',
      }))).toBe('nomina_otros');
    });
  });

  describe('Cuota autónomo (partner-aware)', () => {
    it('cuota_autonomo + Pablo → cuota_pablo', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'cuota_autonomo',
        concept: 'Cuota de autónomo — Pablo',
      }))).toBe('cuota_pablo');
    });

    it('cuota_autonomo + Alfonso → cuota_alfonso', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'cuota_autonomo',
        concept: 'Cuota de autónomo — Alfonso',
      }))).toBe('cuota_alfonso');
    });

    it('factura_autonomo + Pablo → cuota_pablo (agrupado)', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'factura_autonomo',
        counterpartyName: 'RETA Pablo García',
      }))).toBe('cuota_pablo');
    });

    it('cuota_autonomo sin persona → cuota_otros', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'cuota_autonomo',
        concept: 'Cuota autónomo',
      }))).toBe('cuota_otros');
    });
  });

  describe('Seguridad Social (siempre agregado)', () => {
    it('seguridad_social → seguridad_social', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'seguridad_social',
        concept: 'SS junio',
      }))).toBe('seguridad_social');
    });
  });

  describe('Mapeo directo por subtipo', () => {
    const cases: Array<[string, ExpenseSubgroupKey]> = [
      ['suscripcion_software', 'software_ia'],
      ['herramienta_ia',       'software_ia'],
      ['gestoria',             'gestoria'],
      ['fiscal_impuestos',     'fiscal'],
      ['ajuste_fiscal',        'fiscal'],
      ['marketing_publicidad', 'marketing'],
      ['comision_bancaria',    'comisiones'],
      ['comision_plataforma',  'comisiones'],
      ['pago_talento',         'pagos_talentos'],
      ['coste_produccion',     'campana_otros'],
      ['otros_campana',        'campana_otros'],
      ['seguro_medico',        'seguro_medico'],
      ['gasto_general',        'gasto_general'],
    ];

    it.each(cases)('subtype=%s → %s', (subtype, expected) => {
      expect(classifyExpenseSubgroup(makeInput({ expenseSubtype: subtype })))
        .toBe(expected);
    });
  });

  describe('Guardarraíl anti falso positivo', () => {
    it('pago_talento con "Pablo" en concepto → pagos_talentos (no nomina_pablo)', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'pago_talento',
        concept: 'Pago talento Pablo Streamer',
      }))).toBe('pagos_talentos');
    });

    it('marketing_publicidad con "Alfonso" en concepto → marketing (no nomina)', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'marketing_publicidad',
        concept: 'Sponsor Alfonso Torneo',
      }))).toBe('marketing');
    });
  });

  describe('Sin subtipo', () => {
    it('subtype=null + group=null → sin_clasificar', () => {
      expect(classifyExpenseSubgroup(makeInput({}))).toBe('sin_clasificar');
    });

    it('subtype=null + group=campaign_direct → campana_otros', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseGroup: 'campaign_direct',
      }))).toBe('campana_otros');
    });

    it('subtype=null + group=operational → sin_clasificar', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseGroup: 'operational',
      }))).toBe('sin_clasificar');
    });
  });
});

// ── Agregación ─────────────────────────────────────────────────────────────

describe('summarizeExpenseSubgroups()', () => {
  it('devuelve orden DESC por importe', () => {
    const map = new Map<ExpenseSubgroupKey, { amount: number; count: number }>();
    map.set('nomina_pablo',   { amount: 5090, count: 4 });
    map.set('software_ia',    { amount:  420, count: 5 });
    map.set('nomina_alfonso', { amount: 4107, count: 3 });
    const out = summarizeExpenseSubgroups(map, 10_000);
    expect(out.map((r) => r.key)).toEqual(['nomina_pablo', 'nomina_alfonso', 'software_ia']);
  });

  it('calcula pct = amount / total * 100', () => {
    const map = new Map<ExpenseSubgroupKey, { amount: number; count: number }>();
    map.set('nomina_pablo', { amount: 500, count: 1 });
    const out = summarizeExpenseSubgroups(map, 2000);
    expect(out[0]?.pct).toBe(25);
  });

  it('pct = 0 cuando totalExpense es 0 (no NaN)', () => {
    const map = new Map<ExpenseSubgroupKey, { amount: number; count: number }>();
    map.set('sin_clasificar', { amount: 0, count: 1 });
    const out = summarizeExpenseSubgroups(map, 0);
    expect(out[0]?.pct).toBe(0);
    expect(Number.isNaN(out[0]?.pct ?? NaN)).toBe(false);
  });

  it('excluye subgrupos con count = 0', () => {
    const map = new Map<ExpenseSubgroupKey, { amount: number; count: number }>();
    map.set('nomina_pablo',   { amount: 100, count: 1 });
    map.set('nomina_alfonso', { amount:   0, count: 0 });
    const out = summarizeExpenseSubgroups(map, 100);
    expect(out.map((r) => r.key)).toEqual(['nomina_pablo']);
  });

  it('label sale del EXPENSE_SUBGROUP_LABELS', () => {
    const map = new Map<ExpenseSubgroupKey, { amount: number; count: number }>();
    map.set('cuota_alfonso', { amount: 1890, count: 6 });
    const out = summarizeExpenseSubgroups(map, 1890);
    expect(out[0]?.label).toBe('Cuota autónomo Alfonso');
    expect(out[0]?.label).toBe(EXPENSE_SUBGROUP_LABELS.cuota_alfonso);
  });

  it('suma de subgrupos = total (tolerancia < 0.01)', () => {
    // Emula la ruta feliz: acumulador tiene lo mismo que sumaría el loop de gastos.
    const parts: Array<[ExpenseSubgroupKey, number, number]> = [
      ['nomina_pablo',   5090.00, 4],
      ['nomina_alfonso', 4107.00, 3],
      ['cuota_pablo',    1890.00, 6],
      ['cuota_alfonso',  1890.00, 6],
      ['software_ia',     420.00, 5],
    ];
    const map = new Map<ExpenseSubgroupKey, { amount: number; count: number }>();
    for (const [key, amount, count] of parts) map.set(key, { amount, count });
    const total = parts.reduce((s, [, amt]) => s + amt, 0);
    const out = summarizeExpenseSubgroups(map, total);
    const sum = out.reduce((s, r) => s + r.amount, 0);
    expect(Math.abs(sum - total)).toBeLessThan(0.01);
  });
});

// ── Chequeos estáticos ─────────────────────────────────────────────────────

describe('Integración /admin/finanzas/pl', () => {
  const pageSrc = read('src/app/admin/(dashboard)/finanzas/pl/page.tsx');
  const querySrc = read('src/lib/queries/financeDashboard/pnlDetail.ts');
  const componentSrc = read('src/features/admin/pnl/components/AnnualExpenseBreakdown.tsx');

  it('page.tsx importa y renderiza AnnualExpenseBreakdown', () => {
    expect(pageSrc).toMatch(/from\s+['"]@\/features\/admin\/pnl\/components\/AnnualExpenseBreakdown['"]/);
    expect(pageSrc).toMatch(/<AnnualExpenseBreakdown\b/);
    expect(pageSrc).toMatch(/rows=\{pnl\.expenseBySubgroup\}/);
    expect(pageSrc).toMatch(/totalExpense=\{pnl\.gastos\}/);
  });

  it('getFinancePnL declara expenseBySubgroup en el resultado', () => {
    expect(querySrc).toMatch(/expenseBySubgroup:\s*readonly ExpenseSubgroupRow\[\]/);
  });

  it('getFinancePnL añade expenseSubtype, concept y counterpartyName al SELECT', () => {
    expect(querySrc).toMatch(/expenseSubtype:\s*invoices\.expenseSubtype/);
    expect(querySrc).toMatch(/concept:\s*invoices\.concept/);
    expect(querySrc).toMatch(/counterpartyName:\s*invoices\.counterpartyName/);
  });

  it('getFinancePnL usa el clasificador en el loop', () => {
    expect(querySrc).toMatch(/classifyExpenseSubgroup\(/);
    expect(querySrc).toMatch(/summarizeExpenseSubgroups\(/);
  });

  it('componente evita NaN% cuando total = 0', () => {
    // Rama que devuelve el "empty state" ANTES de dividir → sin cálculo de pct.
    expect(componentSrc).toMatch(/totalExpense <= 0/);
    expect(componentSrc).not.toMatch(/NaN/);
  });

  it('componente respeta los filtros pasando from/to al título', () => {
    // Título dinámico se computa en función del rango recibido.
    expect(componentSrc).toMatch(/isYearToDateRange\(from,\s*to\)/);
    expect(componentSrc).toMatch(/Dónde se ha ido el dinero este año/);
    expect(componentSrc).toMatch(/Dónde se ha ido el dinero en este periodo/);
  });
});

// ── Anti-scope-creep ───────────────────────────────────────────────────────

describe('Anti-scope-creep', () => {
  const filesToScan = [
    'src/lib/queries/financeDashboard/expenseSubgroups.ts',
    'src/lib/queries/financeDashboard/pnlDetail.ts',
    'src/features/admin/pnl/components/AnnualExpenseBreakdown.tsx',
    'src/app/admin/(dashboard)/finanzas/pl/page.tsx',
  ];

  it.each(filesToScan)('%s no importa Resend ni utilidades de email', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/from\s+['"]resend['"]/);
    expect(src).not.toMatch(/@\/lib\/email/);
    expect(src).not.toMatch(/sendEmail/);
  });

  it.each(filesToScan)('%s no referencia invoice_reminders ni dunning', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/invoice_reminders/);
    expect(src).not.toMatch(/dunning/i);
  });

  it('expenseSubgroups.ts no accede a la DB ni a server-only', () => {
    const src = read('src/lib/queries/financeDashboard/expenseSubgroups.ts');
    expect(src).not.toMatch(/^['"]server-only['"];/m);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/db['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/db\/schema['"]/);
  });

  it('cambios NO incluyen definiciones de tabla nuevas', () => {
    const src = read('src/lib/queries/financeDashboard/pnlDetail.ts');
    expect(src).not.toMatch(/pgTable\s*\(/);
    expect(src).not.toMatch(/alterTable/);
  });
});
