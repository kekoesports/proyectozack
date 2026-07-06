/**
 * Contratos estructurales del Resumen v3 (PR 2 finanzas rediseño).
 *
 * Verifica que la página del resumen:
 *   1. Renderiza los bloques nuevos v3 en el orden esperado.
 *   2. Mantiene los bloques v2 existentes al final.
 *   3. Pasa los datos correctos a cada bloque.
 *   4. Aviso de bank data se muestra condicionalmente.
 *   5. Copy prohibido no aparece en los bloques v3.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[finanzas-resumen-v3] jerarquía y bloques', () => {
  const src = read('src/app/admin/(dashboard)/finanzas/resumen/page.tsx');

  it('importa todos los bloques v3', () => {
    expect(src).toMatch(/import\s*\{\s*KpisPrincipales\s*\}/);
    expect(src).toMatch(/import\s*\{\s*BankDataWarning\s*\}/);
    expect(src).toMatch(/import\s*\{\s*LecturaRapida\s*\}/);
    expect(src).toMatch(/import\s*\{\s*AlertasBloque\s*\}/);
    expect(src).toMatch(/import\s*\{\s*IncomeExpenseChart\s*\}/);
    expect(src).toMatch(/import\s*\{\s*InvoicedVsCollectedChart\s*\}/);
    expect(src).toMatch(/import\s*\{\s*ExpensesByCategoryChart\s*\}/);
    expect(src).toMatch(/import\s*\{\s*AgingChart\s*\}/);
  });

  it('preserva los bloques v2 al final (retro-compat visual)', () => {
    expect(src).toMatch(/<ResumenIngresosBlock\s+ingresos=\{resumen\.ingresos\}/);
    expect(src).toMatch(/<ResumenCostesMargenBlock/);
    expect(src).toMatch(/<ResumenNominasBlock/);
    expect(src).toMatch(/<ResumenImpuestosBlock/);
    expect(src).toMatch(/<ResumenOperativosBlock/);
    expect(src).toMatch(/<ResumenResultadoBlock/);
    expect(src).toMatch(/<ResumenPendientesBlock/);
  });

  it('jerarquía correcta: KPIs > aviso > lectura+alertas > gráficos > bloques v2', () => {
    const idxKpis = src.indexOf('<KpisPrincipales');
    const idxBank = src.indexOf('<BankDataWarning');
    const idxLectura = src.indexOf('<LecturaRapida');
    const idxAlertas = src.indexOf('<AlertasBloque');
    const idxIncome = src.indexOf('<IncomeExpenseChart');
    const idxV2 = src.indexOf('<ResumenIngresosBlock');
    expect(idxKpis).toBeGreaterThan(-1);
    expect(idxBank).toBeGreaterThan(idxKpis);
    expect(idxLectura).toBeGreaterThan(idxBank);
    expect(idxAlertas).toBeGreaterThan(idxBank);
    expect(idxIncome).toBeGreaterThan(idxLectura);
    expect(idxV2).toBeGreaterThan(idxIncome);
  });

  it('carga los datos vía Promise.all con las 6 queries necesarias', () => {
    expect(src).toMatch(/getFinanzasResumenV2/);
    expect(src).toMatch(/getFinanceDashboard/);
    expect(src).toMatch(/getCashflowSeries\(12\)/);
    expect(src).toMatch(/getArAging/);
    expect(src).toMatch(/getUnclassifiedExpenseCount/);
    expect(src).toMatch(/getBankDataStatus/);
  });
});

describe('[finanzas-resumen-v3] copy prohibido', () => {
  const FILES = [
    'src/features/admin/finance-dashboard/components/resumen-v3/KpisPrincipales.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v3/LecturaRapida.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v3/AlertasBloque.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v3/BankDataWarning.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v3/IncomeExpenseChart.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v3/InvoicedVsCollectedChart.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v3/ExpensesByCategoryChart.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v3/AgingChart.tsx',
  ] as const;

  // El usuario pidió evitar jerga contable pesada salvo en Informes.
  const FORBIDDEN = /\b(pasivo|activo corriente|asiento contable|devengo)\b/i;

  it.each(FILES)('%s no contiene copy contable prohibido', (file) => {
    const src = read(file);
    expect(src).not.toMatch(FORBIDDEN);
  });
});

describe('[finanzas-resumen-v3] BankDataWarning es condicional', () => {
  const src = read('src/features/admin/finance-dashboard/components/resumen-v3/BankDataWarning.tsx');

  it('devuelve null si hay transactions o payments > 0', () => {
    expect(src).toMatch(/bankTransactionsCount\s*>\s*0\s*\|\|\s*invoicePaymentsCount\s*>\s*0/);
    expect(src).toMatch(/return null/);
  });

  it('menciona explícitamente que 0 puede ser por falta de importación', () => {
    expect(src).toMatch(/Sin datos bancarios importados/);
    expect(src).toMatch(/movimientos conciliados/);
  });
});

describe('[finanzas-resumen-v3] LecturaRapida es honesta y sin invenciones', () => {
  const src = read('src/features/admin/finance-dashboard/components/resumen-v3/LecturaRapida.tsx');

  it('tiene estado vacío honesto', () => {
    expect(src).toMatch(/Sin datos suficientes para una lectura/);
  });

  it('cada insight tiene semántica de color explícita (positive/warning/neutral)', () => {
    expect(src).toMatch(/kind:\s*'positive'/);
    expect(src).toMatch(/kind:\s*'warning'/);
    expect(src).toMatch(/kind:\s*'neutral'/);
  });
});
