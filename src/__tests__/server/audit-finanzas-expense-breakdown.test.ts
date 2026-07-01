/**
 * Tests para el desglose visual anual de gastos (con expandible por items).
 *
 * Cubre:
 *   - Clasificador puro: 18 subgrupos + guardarraíles + hosting/dominio.
 *   - Agregación con items ordenados por issueDate ASC.
 *   - Construcción de pdfUrl vía proxy interno (nunca Blob directo).
 *   - Estáticos: page.tsx renderiza el bloque; componente usa <details>;
 *     Sin clasificar tiene CTA; GastosPageClient lee el hash.
 *   - Anti-scope-creep: sin schema/migrations/cron/Resend/emails.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildInvoicePdfUrl,
  classifyExpenseSubgroup,
  detectPartner,
  summarizeExpenseSubgroups,
  EXPENSE_SUBGROUP_LABELS,
  type ExpenseClassifierInput,
  type ExpenseSubgroupAggregate,
  type ExpenseSubgroupItem,
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

function makeItem(overrides: Partial<ExpenseSubgroupItem> = {}): ExpenseSubgroupItem {
  return {
    id: 1,
    issueDate: '2026-01-01',
    concept: 'x',
    counterpartyName: null,
    totalAmount: 0,
    status: 'pagada',
    pdfUrl: null,
    ...overrides,
  };
}

function makeAgg(amount: number, count: number, items: ExpenseSubgroupItem[] = []): ExpenseSubgroupAggregate {
  return { amount, count, items };
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

  describe('Hosting / dominio (frontend-only)', () => {
    it('suscripcion_software + "Vercel Pro" → hosting_dominio', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'suscripcion_software',
        concept: 'Vercel Pro',
      }))).toBe('hosting_dominio');
    });

    it('herramienta_ia + counterparty "Cloudflare" → hosting_dominio', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'herramienta_ia',
        counterpartyName: 'Cloudflare',
      }))).toBe('hosting_dominio');
    });

    it('gasto_general + "Renovación dominio socialpro.es" → hosting_dominio', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'gasto_general',
        concept: 'Renovación dominio socialpro.es',
      }))).toBe('hosting_dominio');
    });

    it('null + "Namecheap DNS" → hosting_dominio', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: null,
        concept: 'Namecheap DNS',
      }))).toBe('hosting_dominio');
    });

    it('null + "GoDaddy renovación" → hosting_dominio', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: null,
        counterpartyName: 'GoDaddy',
      }))).toBe('hosting_dominio');
    });

    it('suscripcion_software + "ChatGPT" (sin señal hosting) → software_ia', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'suscripcion_software',
        concept: 'ChatGPT plus',
      }))).toBe('software_ia');
    });

    it('pago_talento con "Vercel" en concept → pagos_talentos (guardarraíl)', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'pago_talento',
        concept: 'Sponsor Vercel al talento',
      }))).toBe('pagos_talentos');
    });

    it('marketing_publicidad con "hosting" → marketing (guardarraíl)', () => {
      expect(classifyExpenseSubgroup(makeInput({
        expenseSubtype: 'marketing_publicidad',
        concept: 'Campaña hosting jul',
      }))).toBe('marketing');
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

  describe('Guardarraíl anti falso positivo (nómina)', () => {
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

// ── buildInvoicePdfUrl ─────────────────────────────────────────────────────

describe('buildInvoicePdfUrl()', () => {
  it('devuelve el proxy interno cuando invoiceFileId !== null', () => {
    const url = buildInvoicePdfUrl({ id: 42, invoiceFileId: 7, fileUrl: null });
    expect(url).toBe('/api/admin/facturacion/42/pdf');
  });

  it('devuelve el proxy interno cuando solo fileUrl existe (legacy)', () => {
    const url = buildInvoicePdfUrl({ id: 99, invoiceFileId: null, fileUrl: 'https://blob.vercel-storage.com/private/xxx' });
    expect(url).toBe('/api/admin/facturacion/99/pdf');
  });

  it('devuelve null si no hay ni invoiceFileId ni fileUrl', () => {
    expect(buildInvoicePdfUrl({ id: 1, invoiceFileId: null, fileUrl: null })).toBeNull();
  });

  it('nunca expone la URL directa de Blob privado', () => {
    const url = buildInvoicePdfUrl({ id: 5, invoiceFileId: 1, fileUrl: 'https://blob.vercel-storage.com/private/leak' });
    expect(url).not.toMatch(/blob\.vercel-storage/);
    expect(url).not.toMatch(/^https:\/\//);
  });
});

// ── Agregación con items ────────────────────────────────────────────────────

describe('summarizeExpenseSubgroups()', () => {
  it('devuelve orden DESC por importe', () => {
    const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
    map.set('nomina_pablo',   makeAgg(5090, 4));
    map.set('software_ia',    makeAgg( 420, 5));
    map.set('nomina_alfonso', makeAgg(4107, 3));
    const out = summarizeExpenseSubgroups(map, 10_000);
    expect(out.map((r) => r.key)).toEqual(['nomina_pablo', 'nomina_alfonso', 'software_ia']);
  });

  it('calcula pct = amount / total * 100', () => {
    const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
    map.set('nomina_pablo', makeAgg(500, 1));
    const out = summarizeExpenseSubgroups(map, 2000);
    expect(out[0]?.pct).toBe(25);
  });

  it('pct = 0 cuando totalExpense es 0 (no NaN)', () => {
    const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
    map.set('sin_clasificar', makeAgg(0, 1));
    const out = summarizeExpenseSubgroups(map, 0);
    expect(out[0]?.pct).toBe(0);
    expect(Number.isNaN(out[0]?.pct ?? NaN)).toBe(false);
  });

  it('excluye subgrupos con count = 0', () => {
    const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
    map.set('nomina_pablo',   makeAgg(100, 1));
    map.set('nomina_alfonso', makeAgg(  0, 0));
    const out = summarizeExpenseSubgroups(map, 100);
    expect(out.map((r) => r.key)).toEqual(['nomina_pablo']);
  });

  it('label sale del EXPENSE_SUBGROUP_LABELS', () => {
    const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
    map.set('cuota_alfonso', makeAgg(1890, 6));
    const out = summarizeExpenseSubgroups(map, 1890);
    expect(out[0]?.label).toBe('Cuota autónomo Alfonso');
    expect(out[0]?.label).toBe(EXPENSE_SUBGROUP_LABELS.cuota_alfonso);
  });

  it('suma de subgrupos = total (tolerancia < 0.01)', () => {
    const parts: Array<[ExpenseSubgroupKey, number, number]> = [
      ['nomina_pablo',   5090.00, 4],
      ['nomina_alfonso', 4107.00, 3],
      ['cuota_pablo',    1890.00, 6],
      ['cuota_alfonso',  1890.00, 6],
      ['software_ia',     420.00, 5],
    ];
    const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
    for (const [key, amount, count] of parts) map.set(key, makeAgg(amount, count));
    const total = parts.reduce((s, [, amt]) => s + amt, 0);
    const out = summarizeExpenseSubgroups(map, total);
    const sum = out.reduce((s, r) => s + r.amount, 0);
    expect(Math.abs(sum - total)).toBeLessThan(0.01);
  });

  describe('items dentro del subgrupo', () => {
    it('cada subgrupo devuelto incluye su array de items', () => {
      const items = [
        makeItem({ id: 10, issueDate: '2026-01-01', totalAmount: 100 }),
        makeItem({ id: 11, issueDate: '2026-02-01', totalAmount: 100 }),
      ];
      const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
      map.set('nomina_pablo', makeAgg(200, 2, items));
      const out = summarizeExpenseSubgroups(map, 200);
      expect(out[0]?.items).toHaveLength(2);
    });

    it('items ordenados por issueDate ASC dentro de cada subgrupo', () => {
      const items = [
        makeItem({ id: 3, issueDate: '2026-03-01' }),
        makeItem({ id: 1, issueDate: '2026-01-01' }),
        makeItem({ id: 2, issueDate: '2026-02-01' }),
      ];
      const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
      map.set('nomina_pablo', makeAgg(300, 3, items));
      const out = summarizeExpenseSubgroups(map, 300);
      expect(out[0]?.items.map((i) => i.id)).toEqual([1, 2, 3]);
    });

    it('subgroup.count === items.length', () => {
      const items = [
        makeItem({ id: 1 }),
        makeItem({ id: 2 }),
        makeItem({ id: 3 }),
      ];
      const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
      map.set('software_ia', makeAgg(300, 3, items));
      const out = summarizeExpenseSubgroups(map, 300);
      expect(out[0]?.count).toBe(out[0]?.items.length);
    });

    it('SUM(items.totalAmount) === subgroup.amount (tolerancia < 0.01)', () => {
      const items = [
        makeItem({ id: 1, totalAmount: 1696.55 }),
        makeItem({ id: 2, totalAmount: 1696.55 }),
        makeItem({ id: 3, totalAmount: 1696.55 }),
        makeItem({ id: 4, totalAmount: 1696.55 }),
      ];
      const total = 1696.55 * 4;
      const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
      map.set('nomina_pablo', makeAgg(total, 4, items));
      const out = summarizeExpenseSubgroups(map, total);
      const sum = out[0]?.items.reduce((s, i) => s + i.totalAmount, 0) ?? 0;
      expect(Math.abs(sum - (out[0]?.amount ?? 0))).toBeLessThan(0.01);
    });

    it('ningún item filtra la URL directa de Blob', () => {
      const items = [
        makeItem({ id: 1, pdfUrl: '/api/admin/facturacion/1/pdf' }),
        makeItem({ id: 2, pdfUrl: null }),
      ];
      const map = new Map<ExpenseSubgroupKey, ExpenseSubgroupAggregate>();
      map.set('nomina_pablo', makeAgg(200, 2, items));
      const out = summarizeExpenseSubgroups(map, 200);
      for (const it of out[0]?.items ?? []) {
        expect(it.pdfUrl ?? '').not.toMatch(/blob\.vercel-storage/);
        expect(it.pdfUrl ?? '').not.toMatch(/^https?:\/\//);
      }
    });
  });
});

// ── Chequeos estáticos ─────────────────────────────────────────────────────

describe('Integración /admin/finanzas/pl', () => {
  const pageSrc = read('src/app/admin/(dashboard)/finanzas/pl/page.tsx');
  const querySrc = read('src/lib/queries/financeDashboard/pnlDetail.ts');
  const componentSrc = read('src/features/admin/pnl/components/AnnualExpenseBreakdown.tsx');
  const gastosClientSrc = read('src/app/admin/(dashboard)/finanzas/gastos/GastosPageClient.tsx');
  const subgroupsSrc = read('src/lib/queries/financeDashboard/expenseSubgroups.ts');

  it('page.tsx importa y renderiza AnnualExpenseBreakdown', () => {
    expect(pageSrc).toMatch(/from\s+['"]@\/features\/admin\/pnl\/components\/AnnualExpenseBreakdown['"]/);
    expect(pageSrc).toMatch(/<AnnualExpenseBreakdown\b/);
    expect(pageSrc).toMatch(/rows=\{pnl\.expenseBySubgroup\}/);
    expect(pageSrc).toMatch(/totalExpense=\{pnl\.gastos\}/);
  });

  it('getFinancePnL declara expenseBySubgroup en el resultado', () => {
    expect(querySrc).toMatch(/expenseBySubgroup:\s*readonly ExpenseSubgroupRow\[\]/);
  });

  it('getFinancePnL añade id, expenseSubtype, concept, counterpartyName, invoiceFileId y fileUrl al SELECT', () => {
    expect(querySrc).toMatch(/\bid:\s*invoices\.id\b/);
    expect(querySrc).toMatch(/expenseSubtype:\s*invoices\.expenseSubtype/);
    expect(querySrc).toMatch(/concept:\s*invoices\.concept/);
    expect(querySrc).toMatch(/counterpartyName:\s*invoices\.counterpartyName/);
    expect(querySrc).toMatch(/invoiceFileId:\s*invoices\.invoiceFileId/);
    expect(querySrc).toMatch(/fileUrl:\s*invoices\.fileUrl/);
  });

  it('getFinancePnL usa el clasificador y buildInvoicePdfUrl en el loop', () => {
    expect(querySrc).toMatch(/classifyExpenseSubgroup\(/);
    expect(querySrc).toMatch(/summarizeExpenseSubgroups\(/);
    expect(querySrc).toMatch(/buildInvoicePdfUrl\(/);
  });

  it('componente evita NaN% cuando total = 0', () => {
    expect(componentSrc).toMatch(/totalExpense <= 0/);
    expect(componentSrc).not.toMatch(/NaN/);
  });

  it('componente respeta los filtros pasando from/to al título', () => {
    expect(componentSrc).toMatch(/isYearToDateRange\(from,\s*to\)/);
    expect(componentSrc).toMatch(/Dónde se ha ido el dinero este año/);
    expect(componentSrc).toMatch(/Dónde se ha ido el dinero en este periodo/);
  });

  it('componente usa <details> y <summary> HTML nativos', () => {
    expect(componentSrc).toMatch(/<details\b/);
    expect(componentSrc).toMatch(/<summary\b/);
  });

  it('componente NO usa useState ni useEffect (server component)', () => {
    expect(componentSrc).not.toMatch(/useState\(/);
    expect(componentSrc).not.toMatch(/useEffect\(/);
  });

  it("componente NO declara 'use client'", () => {
    // Solo cuenta como directiva si es la primera línea "no-import".
    expect(componentSrc.split('\n')[0]?.trim()).not.toBe("'use client';");
    expect(componentSrc).not.toMatch(/^['"]use client['"];/m);
  });

  it('Sin clasificar renderiza CTA con enlace a /admin/finanzas/gastos#sin-clasificar', () => {
    expect(componentSrc).toMatch(/\/admin\/finanzas\/gastos#sin-clasificar/);
    expect(componentSrc).toMatch(/Clasificar/);
  });

  it('GastosPageClient activa la tab "Sin clasificar" al detectar el hash', () => {
    // Puede ser vía useEffect + setActive, o vía initializer del useState
    // (patrón preferido — sin efecto, sin warning de set-state-in-effect).
    expect(gastosClientSrc).toMatch(/window\.location\.hash/);
    expect(gastosClientSrc).toMatch(/['"]#sin-clasificar['"]/);
    expect(gastosClientSrc).toMatch(/Sin clasificar/);
  });

  it('la tabla de items pasa por humanStatus() y no muestra status raw', () => {
    expect(componentSrc).toMatch(/humanStatus\(/);
    // Nunca renderiza {it.status} crudo dentro del JSX.
    expect(componentSrc).not.toMatch(/\{it\.status\}/);
  });

  it('expenseSubgroups.ts expone el subgrupo hosting_dominio con su label', () => {
    expect(subgroupsSrc).toMatch(/hosting_dominio/);
    expect(subgroupsSrc).toMatch(/Hosting \/ dominio/);
  });
});

// ── Anti-scope-creep ───────────────────────────────────────────────────────

describe('Anti-scope-creep', () => {
  const filesToScan = [
    'src/lib/queries/financeDashboard/expenseSubgroups.ts',
    'src/lib/queries/financeDashboard/pnlDetail.ts',
    'src/features/admin/pnl/components/AnnualExpenseBreakdown.tsx',
    'src/app/admin/(dashboard)/finanzas/pl/page.tsx',
    'src/app/admin/(dashboard)/finanzas/gastos/GastosPageClient.tsx',
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
