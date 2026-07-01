/**
 * Tests Fase 1A.1 — Finanzas CEO Dashboard.
 *
 * `/admin/finanzas/resumen` es ahora la home de Finanzas y debe responder en
 * 10 segundos a las preguntas del CEO:
 *
 *   [1] La página llama a getFinanceDashboard() y pasa alerts + receivables
 *       al componente cliente.
 *   [2-7] FinanceMonthlyControl renderiza 6 KPI cards con labels humanos
 *         (Facturado / Cobrado / Pendiente cobrar / Gastado / Resultado /
 *         Pendiente pagar), en ese orden.
 *   [8] FinanceAlertsList solo se renderiza si alerts.length > 0
 *       (no caja vacía).
 *   [9] ReceivablesTable se integra como sección dentro del control mensual,
 *       y muestra su propio empty state cuando no hay cobros pendientes.
 *   [10] No hay strings técnicos visibles (kind, scope, expenseSubtype,
 *        campaign_direct, etc.).
 *   [11] Tipado: el componente acepta props `alerts` y `receivables`
 *        readonly.
 *
 * Todos los tests son estáticos sobre el source (no invocan DB).
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');

// ── [1] Página llama a getFinanceDashboard y propaga alerts/receivables ─────

// Nota: el control mensual se movió de /admin/finanzas/resumen a /admin/finanzas/mes
// en el rediseño del resumen V2. Estos wiring checks se mantienen apuntando a la nueva
// ubicación para asegurar que no hay regresión en la pantalla mensual.
describe('finanzas/mes/page.tsx — wiring del control mensual', () => {
  const src = read('src/app/admin/(dashboard)/finanzas/mes/page.tsx');

  it('[1a] importa getFinanceDashboard desde @/lib/queries/financeDashboard', () => {
    expect(src).toMatch(/import\s*\{\s*getFinanceDashboard\s*\}\s*from\s*['"]@\/lib\/queries\/financeDashboard['"]/);
  });

  it('[1b] llama a getFinanceDashboard dentro del Promise.all', () => {
    expect(src).toMatch(/Promise\.all\(\s*\[[\s\S]*getFinanceDashboard\(\)[\s\S]*\]/);
  });

  it('[1c] pasa alerts y receivables a FinanceMonthlyControl', () => {
    expect(src).toMatch(/alerts=\{[^}]*\.alerts\}/);
    expect(src).toMatch(/receivables=\{[^}]*\.receivables\}/);
  });

  it('[1d] mantiene flow/stock/breakdown/docs (no regresión)', () => {
    expect(src).toMatch(/flow=\{flow\}/);
    expect(src).toMatch(/stock=\{stock\}/);
    expect(src).toMatch(/breakdown=\{breakdown\}/);
    expect(src).toMatch(/docs=\{docs\}/);
  });

  it('[1e] sigue protegida por requirePermission("facturacion", "read")', () => {
    expect(src).toMatch(/requirePermission\(\s*['"]facturacion['"]\s*,\s*['"]read['"]\s*\)/);
  });
});

// ── [2-7] 6 KPI cards con labels humanos ────────────────────────────────────

describe('FinanceMonthlyControl — 6 KPI cards CEO-friendly', () => {
  const src = read('src/features/admin/finance-dashboard/components/FinanceMonthlyControl.tsx');

  it('[2] KPI "Facturado del mes" mapeado a flow.incomeTotal', () => {
    expect(src).toMatch(/label=['"]Facturado del mes['"][\s\S]{0,200}flow\.incomeTotal/);
  });

  it('[3] KPI "Cobrado del mes" mapeado a flow.cobradoMes', () => {
    expect(src).toMatch(/label=['"]Cobrado del mes['"][\s\S]{0,200}flow\.cobradoMes/);
  });

  it('[4] KPI "Pendiente de cobrar" mapeado a stock.pendienteCobro', () => {
    expect(src).toMatch(/label=['"]Pendiente de cobrar['"][\s\S]{0,300}stock\.pendienteCobro/);
  });

  it('[5] KPI "Gastado del mes" mapeado a flow.gastosTotal', () => {
    expect(src).toMatch(/label=['"]Gastado del mes['"][\s\S]{0,200}flow\.gastosTotal/);
  });

  it('[6] KPI "Resultado del mes" mapeado a flow.resultado', () => {
    expect(src).toMatch(/label=['"]Resultado del mes['"][\s\S]{0,200}flow\.resultado/);
  });

  it('[7] KPI "Pendiente de pagar" mapeado a stock.pendientePago', () => {
    expect(src).toMatch(/label=['"]Pendiente de pagar['"][\s\S]{0,300}stock\.pendientePago/);
  });

  it('los 6 labels viven en el mismo grid (orden visible)', () => {
    const labels = [
      'Facturado del mes',
      'Cobrado del mes',
      'Pendiente de cobrar',
      'Gastado del mes',
      'Resultado del mes',
      'Pendiente de pagar',
    ];
    let last = -1;
    for (const label of labels) {
      const idx = src.indexOf(label);
      expect({ label, idx }).toEqual({ label, idx: expect.any(Number) });
      expect(idx).toBeGreaterThan(last);
      last = idx;
    }
  });

  it('"Al día" se muestra cuando pendiente = 0 (humanización)', () => {
    expect(src).toMatch(/stock\.pendienteCobro\s*>\s*0[\s\S]{0,200}['"]Al día['"]/);
    expect(src).toMatch(/stock\.pendientePago\s*>\s*0[\s\S]{0,200}['"]Al día['"]/);
  });
});

// ── [8] Alertas solo si hay (no caja vacía) ─────────────────────────────────

describe('FinanceMonthlyControl — alertas condicionales', () => {
  const src = read('src/features/admin/finance-dashboard/components/FinanceMonthlyControl.tsx');

  it('[8a] importa FinanceAlertsList', () => {
    expect(src).toMatch(/import\s*\{\s*FinanceAlertsList\s*\}\s*from\s*['"]\.\/FinanceAlertsList['"]/);
  });

  it('[8b] FinanceAlertsList se renderiza solo si alerts.length > 0', () => {
    expect(src).toMatch(/alerts\.length\s*>\s*0\s*&&[\s\S]{0,200}<FinanceAlertsList/);
  });

  it('[8c] no aparece "Sin alertas financieras activas" en el control mensual', () => {
    expect(src).not.toContain('Sin alertas financieras activas');
  });
});

// ── [9] ReceivablesTable embebida ────────────────────────────────────────────

describe('FinanceMonthlyControl — cobros pendientes integrados', () => {
  const src = read('src/features/admin/finance-dashboard/components/FinanceMonthlyControl.tsx');

  it('[9a] importa ReceivablesTable', () => {
    expect(src).toMatch(/import\s*\{\s*ReceivablesTable\s*\}\s*from\s*['"]\.\/ReceivablesTable['"]/);
  });

  it('[9b] se renderiza pasando receivables como prop', () => {
    expect(src).toMatch(/<ReceivablesTable\s+rows=\{receivables\}\s*\/>/);
  });

  it('[9c] vive dentro de una sección con aria-label "Cobros pendientes"', () => {
    expect(src).toMatch(/aria-label=['"]Cobros pendientes['"]/);
  });
});

// ── [10] Sin strings técnicos en JSX ────────────────────────────────────────

describe('FinanceMonthlyControl — labels CEO-friendly (sin strings técnicos)', () => {
  const src = read('src/features/admin/finance-dashboard/components/FinanceMonthlyControl.tsx');

  const FORBIDDEN_IN_LABELS = [
    'campaign_direct',
    'invoice_payments',
    'expenseSubtype',
    'expenseGroup',
    'kind=',
    'scope=',
  ];

  it('[10] no aparecen strings técnicos en los labels de los KpiCard', () => {
    for (const s of FORBIDDEN_IN_LABELS) {
      expect(src).not.toContain(s);
    }
  });

  it('mantiene "Dónde se ha gastado el dinero" (no regresión)', () => {
    expect(src).toContain('Dónde se ha gastado el dinero');
  });

  it('mantiene el contextualText y el bloque de docs (no regresión)', () => {
    expect(src).toContain('contextualText');
    expect(src).toContain('Documentos del mes');
  });
});

// ── [11] Tipado de props readonly ───────────────────────────────────────────

describe('FinanceMonthlyControl — tipado de props', () => {
  const src = read('src/features/admin/finance-dashboard/components/FinanceMonthlyControl.tsx');

  it('[11a] importa tipos FinanceAlert y ReceivableRow desde @/types/financeDashboard', () => {
    expect(src).toMatch(/import\s+type\s*\{[^}]*\bFinanceAlert\b[^}]*\bReceivableRow\b[^}]*\}\s+from\s+['"]@\/types\/financeDashboard['"]/);
  });

  it('[11b] props alerts/receivables son readonly arrays', () => {
    expect(src).toMatch(/readonly\s+alerts:\s+readonly\s+FinanceAlert\[\]/);
    expect(src).toMatch(/readonly\s+receivables:\s+readonly\s+ReceivableRow\[\]/);
  });
});
