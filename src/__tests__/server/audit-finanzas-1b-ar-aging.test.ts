/**
 * Tests para Fase 1B — AR Aging sin dunning automático.
 *
 * Cubre:
 *   - Lógica pura del clasificador (buckets, pending, fallback dueDate, KPIs).
 *   - Chequeos estáticos de la nueva ruta, navegación y query.
 *   - Anti-scope-creep: sin Resend, cron, invoice_reminders, migraciones, schema changes.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  applyArAgingFilters,
  calcPending,
  classifyBucket,
  computeKpis,
  diffDaysIso,
  humanStatusLabel,
  resolveEffectiveDueDate,
  sortByAgingPriority,
  summarizeBuckets,
} from '@/lib/queries/financeDashboard/arAging.shared';
import type { ArAgingRow } from '@/types/arAging';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(PROJECT_ROOT, rel));
}

// ── Helper para construir rows sintéticos ──────────────────────────────────

function makeRow(overrides: Partial<ArAgingRow>): ArAgingRow {
  const base: ArAgingRow = {
    id: 1,
    source: 'issued',
    invoiceNumber: 'A-001',
    brandName: null,
    clientName: null,
    entity: null,
    totalAmount: 1000,
    paidAmount: 0,
    pendingAmount: 1000,
    currency: 'EUR',
    status: 'emitida',
    issueDate: '2026-06-01',
    dueDate: '2026-06-30',
    effectiveDueDate: '2026-06-30',
    isEstimatedDueDate: false,
    daysOverdue: 1,
    bucket: '0-30',
    pdfUrl: null,
  };
  return { ...base, ...overrides };
}

describe('[Fase 1B] AR Aging — lógica pura', () => {
  // ── Bucket classification ────────────────────────────────────────────────

  describe('classifyBucket()', () => {
    it('daysOverdue < 0 → por_vencer', () => {
      expect(classifyBucket(-1)).toBe('por_vencer');
      expect(classifyBucket(-30)).toBe('por_vencer');
      expect(classifyBucket(-365)).toBe('por_vencer');
    });

    it('daysOverdue 0..30 → 0-30', () => {
      expect(classifyBucket(0)).toBe('0-30');
      expect(classifyBucket(1)).toBe('0-30');
      expect(classifyBucket(30)).toBe('0-30');
    });

    it('daysOverdue 31..60 → 31-60', () => {
      expect(classifyBucket(31)).toBe('31-60');
      expect(classifyBucket(60)).toBe('31-60');
    });

    it('daysOverdue 61..90 → 61-90', () => {
      expect(classifyBucket(61)).toBe('61-90');
      expect(classifyBucket(90)).toBe('61-90');
    });

    it('daysOverdue > 90 → +90', () => {
      expect(classifyBucket(91)).toBe('+90');
      expect(classifyBucket(500)).toBe('+90');
    });
  });

  // ── Pending calc ────────────────────────────────────────────────────────

  describe('calcPending()', () => {
    it('pending = total - paid', () => {
      expect(calcPending(1000, 400)).toBe(600);
      expect(calcPending(50, 0)).toBe(50);
    });

    it('nunca devuelve negativo (protege sobrepagos)', () => {
      expect(calcPending(100, 200)).toBe(0);
      expect(calcPending(0, 5)).toBe(0);
    });

    it('trunca ruido por debajo de medio céntimo a 0', () => {
      expect(calcPending(100.004, 100)).toBe(0);
      expect(calcPending(100.01, 100)).toBe(0.01);
    });
  });

  // ── Fallback dueDate ────────────────────────────────────────────────────

  describe('resolveEffectiveDueDate()', () => {
    it('usa dueDate cuando existe', () => {
      const r = resolveEffectiveDueDate('2026-01-01', '2026-02-15');
      expect(r.effectiveDueDate).toBe('2026-02-15');
      expect(r.isEstimatedDueDate).toBe(false);
    });

    it('fallback issueDate + 30 días cuando dueDate es null', () => {
      const r = resolveEffectiveDueDate('2026-01-01', null);
      expect(r.effectiveDueDate).toBe('2026-01-31');
      expect(r.isEstimatedDueDate).toBe(true);
    });

    it('fallback cruza el cambio de mes correctamente', () => {
      const r = resolveEffectiveDueDate('2026-06-15', null);
      expect(r.effectiveDueDate).toBe('2026-07-15');
      expect(r.isEstimatedDueDate).toBe(true);
    });
  });

  describe('diffDaysIso()', () => {
    it('devuelve diferencia positiva cuando from > to', () => {
      expect(diffDaysIso('2026-07-10', '2026-07-01')).toBe(9);
    });

    it('devuelve negativo cuando from < to', () => {
      expect(diffDaysIso('2026-07-01', '2026-07-10')).toBe(-9);
    });

    it('devuelve 0 en la misma fecha', () => {
      expect(diffDaysIso('2026-07-01', '2026-07-01')).toBe(0);
    });
  });

  // ── Human labels ────────────────────────────────────────────────────────

  describe('humanStatusLabel()', () => {
    it('siempre "Vencida" cuando el bucket no es por_vencer', () => {
      expect(humanStatusLabel('emitida', '0-30')).toBe('Vencida');
      expect(humanStatusLabel('parcial', '31-60')).toBe('Vencida');
      expect(humanStatusLabel('vencida', '+90')).toBe('Vencida');
    });

    it('mapea status a labels humanos cuando bucket=por_vencer', () => {
      expect(humanStatusLabel('emitida', 'por_vencer')).toBe('Pendiente');
      expect(humanStatusLabel('no_cobrada', 'por_vencer')).toBe('Pendiente');
      expect(humanStatusLabel('pendiente', 'por_vencer')).toBe('Pendiente');
      expect(humanStatusLabel('parcial', 'por_vencer')).toBe('Pagada parcial');
      expect(humanStatusLabel('vencida', 'por_vencer')).toBe('Vencida');
    });
  });

  // ── Filtros ─────────────────────────────────────────────────────────────

  describe('applyArAgingFilters()', () => {
    const rows: ArAgingRow[] = [
      makeRow({ id: 1, bucket: '0-30', brandName: 'Acme', entity: 'España', source: 'issued' }),
      makeRow({ id: 2, bucket: '31-60', brandName: 'Beta', entity: 'Andorra', source: 'issued' }),
      makeRow({ id: 3, bucket: 'por_vencer', brandName: 'Acme', entity: 'España', source: 'internal' }),
    ];

    it('sin filtros devuelve todo', () => {
      expect(applyArAgingFilters(rows, {}).length).toBe(3);
    });

    it('filtra por bucket', () => {
      const out = applyArAgingFilters(rows, { bucket: '0-30' });
      expect(out.map((r) => r.id)).toEqual([1]);
    });

    it('filtra por entity', () => {
      const out = applyArAgingFilters(rows, { entity: 'España' });
      expect(out.map((r) => r.id)).toEqual([1, 3]);
    });

    it('filtra por source', () => {
      const out = applyArAgingFilters(rows, { source: 'internal' });
      expect(out.map((r) => r.id)).toEqual([3]);
    });

    it('combina múltiples filtros con AND', () => {
      const out = applyArAgingFilters(rows, { brand: 'Acme', source: 'issued' });
      expect(out.map((r) => r.id)).toEqual([1]);
    });
  });

  // ── KPIs y agregaciones ─────────────────────────────────────────────────

  describe('computeKpis()', () => {
    it('sin filas devuelve totales a 0 y avg/topBrand null', () => {
      const kpis = computeKpis([]);
      expect(kpis.totalPending).toBe(0);
      expect(kpis.totalOverdue).toBe(0);
      expect(kpis.overdueCount).toBe(0);
      expect(kpis.pendingNotYetDue).toBe(0);
      expect(kpis.avgDaysOverdue).toBeNull();
      expect(kpis.topDebtorBrand).toBeNull();
    });

    it('totalVencido excluye por_vencer', () => {
      const kpis = computeKpis([
        makeRow({ id: 1, pendingAmount: 100, bucket: 'por_vencer', daysOverdue: -5 }),
        makeRow({ id: 2, pendingAmount: 200, bucket: '0-30', daysOverdue: 10 }),
        makeRow({ id: 3, pendingAmount: 300, bucket: '31-60', daysOverdue: 45 }),
      ]);
      expect(kpis.totalPending).toBe(600);
      expect(kpis.totalOverdue).toBe(500);
      expect(kpis.overdueCount).toBe(2);
      expect(kpis.pendingNotYetDue).toBe(100);
    });

    it('avgDaysOverdue excluye por_vencer y devuelve entero', () => {
      const kpis = computeKpis([
        makeRow({ id: 1, bucket: 'por_vencer', daysOverdue: -10 }),
        makeRow({ id: 2, bucket: '0-30', daysOverdue: 10 }),
        makeRow({ id: 3, bucket: '31-60', daysOverdue: 40 }),
      ]);
      expect(kpis.avgDaysOverdue).toBe(25); // (10 + 40) / 2
    });

    it('avgDaysOverdue null si no hay vencidas', () => {
      const kpis = computeKpis([
        makeRow({ id: 1, bucket: 'por_vencer', daysOverdue: -10 }),
        makeRow({ id: 2, bucket: 'por_vencer', daysOverdue: -20 }),
      ]);
      expect(kpis.avgDaysOverdue).toBeNull();
    });

    it('topDebtorBrand suma por marca y devuelve la mayor', () => {
      // Acme suma 100 + 400 = 500. Beta suma 300. Acme gana.
      const kpis = computeKpis([
        makeRow({ id: 1, brandName: 'Acme', pendingAmount: 100 }),
        makeRow({ id: 2, brandName: 'Beta', pendingAmount: 300 }),
        makeRow({ id: 3, brandName: 'Acme', pendingAmount: 400 }),
      ]);
      expect(kpis.topDebtorBrand).toEqual({ name: 'Acme', amount: 500 });
    });

    it('topDebtorBrand ignora filas sin marca', () => {
      const kpis = computeKpis([
        makeRow({ id: 1, brandName: null, pendingAmount: 999 }),
        makeRow({ id: 2, brandName: 'Solo', pendingAmount: 50 }),
      ]);
      expect(kpis.topDebtorBrand).toEqual({ name: 'Solo', amount: 50 });
    });
  });

  describe('summarizeBuckets()', () => {
    it('siempre devuelve los 5 buckets en orden canónico', () => {
      const buckets = summarizeBuckets([]);
      expect(buckets.map((b) => b.key)).toEqual([
        'por_vencer', '0-30', '31-60', '61-90', '+90',
      ]);
      expect(buckets.every((b) => b.amount === 0 && b.count === 0)).toBe(true);
    });

    it('suma correctamente por bucket y calcula %', () => {
      const buckets = summarizeBuckets([
        makeRow({ id: 1, bucket: '0-30', pendingAmount: 100 }),
        makeRow({ id: 2, bucket: '0-30', pendingAmount: 200 }),
        makeRow({ id: 3, bucket: '31-60', pendingAmount: 700 }),
      ]);
      const total = 1000;
      const b030 = buckets.find((b) => b.key === '0-30');
      const b3160 = buckets.find((b) => b.key === '31-60');
      expect(b030).toEqual({ key: '0-30', amount: 300, count: 2, pct: (300 / total) * 100 });
      expect(b3160).toEqual({ key: '31-60', amount: 700, count: 1, pct: 70 });
    });
  });

  describe('sortByAgingPriority()', () => {
    it('ordena por effectiveDueDate ASC, luego pending DESC', () => {
      const rows = sortByAgingPriority([
        makeRow({ id: 1, effectiveDueDate: '2026-05-01', pendingAmount: 100 }),
        makeRow({ id: 2, effectiveDueDate: '2026-04-01', pendingAmount: 500 }),
        makeRow({ id: 3, effectiveDueDate: '2026-05-01', pendingAmount: 800 }),
      ]);
      expect(rows.map((r) => r.id)).toEqual([2, 3, 1]);
    });
  });
});

// ── Chequeos estáticos ─────────────────────────────────────────────────────

describe('[Fase 1B] AR Aging — chequeos estáticos', () => {
  describe('Ruta /admin/finanzas/cobros', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/cobros/page.tsx');

    it('existe la página', () => {
      expect(exists('src/app/admin/(dashboard)/finanzas/cobros/page.tsx')).toBe(true);
    });

    it('llama a requirePermission("facturacion", "read")', () => {
      expect(src).toMatch(
        /requirePermission\(\s*['"]facturacion['"]\s*,\s*['"]read['"]\s*\)/,
      );
    });

    it('importa getArAging', () => {
      expect(src).toMatch(/from\s+['"]@\/lib\/queries\/financeDashboard\/arAging['"]/);
      expect(src).toMatch(/\bgetArAging\b/);
    });

    it('renderiza los 4 sub-componentes de la vista', () => {
      expect(src).toMatch(/ArAgingKPIs/);
      expect(src).toMatch(/ArAgingBuckets/);
      expect(src).toMatch(/ArAgingTable/);
      expect(src).toMatch(/ArAgingFiltersBar/);
    });

    it('renderiza banner multi-divisa cuando hasMultipleCurrencies', () => {
      expect(src).toMatch(/hasMultipleCurrencies/);
      expect(src).toMatch(/distintas divisas/);
    });
  });

  describe('FinanzasNav', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/FinanzasNav.tsx');

    it('incluye tab /admin/finanzas/cobros', () => {
      expect(src).toMatch(/\/admin\/finanzas\/cobros/);
    });

    it('label humano "Cobros pendientes"', () => {
      expect(src).toMatch(/Cobros pendientes/);
    });
  });

  describe('Query getArAging', () => {
    const src = read('src/lib/queries/financeDashboard/arAging.ts');

    it('usa invoicePayments como fuente de paid (no invoices.paidAmount column)', () => {
      expect(src).toMatch(/COALESCE\(SUM\(\$\{invoicePayments\.amount\}\)/);
      expect(src).not.toMatch(/paidAmount:\s*invoices\.paidAmount/);
    });

    it('marca el archivo como server-only', () => {
      expect(src).toMatch(/^['"]server-only['"];/m);
    });

    it('índice de queries re-exporta getArAging', () => {
      const idx = read('src/lib/queries/financeDashboard/index.ts');
      expect(idx).toMatch(/export\s+\{\s*getArAging\s*\}/);
    });
  });

  describe('Componentes AR Aging', () => {
    const files = [
      'src/features/admin/finance-dashboard/components/ArAgingKPIs.tsx',
      'src/features/admin/finance-dashboard/components/ArAgingBuckets.tsx',
      'src/features/admin/finance-dashboard/components/ArAgingTable.tsx',
      'src/features/admin/finance-dashboard/components/ArAgingFilters.tsx',
    ];

    it.each(files)('%s existe', (rel) => {
      expect(exists(rel)).toBe(true);
    });

    it('la tabla no muestra strings técnicos ni status raw', () => {
      const tbl = read('src/features/admin/finance-dashboard/components/ArAgingTable.tsx');
      // No renderiza `row.status` crudo — usa humanStatusLabel
      expect(tbl).toMatch(/humanStatusLabel/);
      expect(tbl).not.toMatch(/\{row\.status\}/);
    });

    it('los KPIs y buckets no muestran labels técnicos como "paidAmount" o "invoice_payments"', () => {
      const kpis = read('src/features/admin/finance-dashboard/components/ArAgingKPIs.tsx');
      const buckets = read('src/features/admin/finance-dashboard/components/ArAgingBuckets.tsx');
      for (const src of [kpis, buckets]) {
        expect(src).not.toMatch(/>\s*paidAmount\s*</);
        expect(src).not.toMatch(/>\s*invoice_payments\s*</);
        expect(src).not.toMatch(/>\s*status\s*raw\s*</);
      }
    });
  });

  describe('Tipos', () => {
    it('existe src/types/arAging.ts con los tipos esperados', () => {
      expect(exists('src/types/arAging.ts')).toBe(true);
      const src = read('src/types/arAging.ts');
      expect(src).toMatch(/ArAgingRow/);
      expect(src).toMatch(/ArAgingBucket/);
      expect(src).toMatch(/ArAgingKpis/);
      expect(src).toMatch(/ArAgingFilters/);
    });
  });
});

// ── Anti-scope-creep ───────────────────────────────────────────────────────

describe('[Fase 1B] Anti-scope-creep', () => {
  const filesToScan = [
    'src/lib/queries/financeDashboard/arAging.ts',
    'src/lib/queries/financeDashboard/arAging.shared.ts',
    'src/app/admin/(dashboard)/finanzas/cobros/page.tsx',
    'src/features/admin/finance-dashboard/components/ArAgingKPIs.tsx',
    'src/features/admin/finance-dashboard/components/ArAgingBuckets.tsx',
    'src/features/admin/finance-dashboard/components/ArAgingTable.tsx',
    'src/features/admin/finance-dashboard/components/ArAgingFilters.tsx',
  ];

  it.each(filesToScan)('%s no importa Resend ni utilidades de email', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/from\s+['"]resend['"]/);
    expect(src).not.toMatch(/@\/lib\/email/);
    expect(src).not.toMatch(/sendEmail/);
  });

  it.each(filesToScan)('%s no referencia invoice_reminders ni tablas nuevas', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/invoice_reminders/);
    expect(src).not.toMatch(/invoiceReminders/);
  });

  it('no se ha creado ninguna migration nueva para esta feature', () => {
    // Los migration snapshots de la Fase 1B no deben aparecer. Si aparecen,
    // significa que alguien tocó schema.
    const src = read('src/lib/queries/financeDashboard/arAging.ts');
    expect(src).not.toMatch(/pgTable\s*\(/);
    expect(src).not.toMatch(/alterTable/);
  });

  it('no hay cron nuevo apuntando a AR aging', () => {
    // Rutas típicas de cron en el proyecto.
    const cronDir = 'src/app/api/cron';
    if (!exists(cronDir)) return;
    const entries = fs.readdirSync(path.join(PROJECT_ROOT, cronDir), { withFileTypes: true });
    const names = entries.map((e) => e.name);
    for (const name of names) {
      expect(name).not.toMatch(/ar-aging|receivables?-remind|invoice-remind|dunning/);
    }
  });

  it('el índice de queries no exporta helpers de dunning ni reminders', () => {
    const idx = read('src/lib/queries/financeDashboard/index.ts');
    expect(idx).not.toMatch(/dunning/i);
    expect(idx).not.toMatch(/reminders?/i);
    expect(idx).not.toMatch(/sendReminder/);
  });
});
