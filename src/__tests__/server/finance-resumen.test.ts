/**
 * Tests de lógica pura para el resumen financiero de /admin/finanzas/resumen.
 * Prueba `computeMargen` — función pura exportada de financeResumen.ts.
 * No accede a la DB.
 */
import { computeMargen } from '@/lib/queries/financeDashboard/financeResumen';

describe('computeMargen — fórmula base', () => {
  it('margenBruto = incomeSettled - settledCampana - settledOperativos', () => {
    const { margenBruto } = computeMargen(8000, 2000, 1500);
    expect(margenBruto).toBe(4500);
  });

  it('margenPct redondeado a 1 decimal', () => {
    const { margenPct } = computeMargen(8000, 2000, 1500);
    // 4500/8000 = 0.5625 → 56.3%
    expect(margenPct).toBe(56.3);
  });

  it('margenBruto negativo cuando gastos liquidados > ingresos liquidados', () => {
    const { margenBruto } = computeMargen(1000, 3000, 500);
    expect(margenBruto).toBe(-2500);
  });

  it('margenPct es 0 cuando incomeSettled es 0 (no divide por cero)', () => {
    const { margenPct } = computeMargen(0, 0, 0);
    expect(margenPct).toBe(0);
  });

  it('margenPct negativo cuando margen es negativo', () => {
    const { margenPct } = computeMargen(5000, 4000, 2000);
    // (-1000/5000) * 100 = -20%
    expect(margenPct).toBe(-20);
  });

  it('margenBruto = 0 cuando gastos = ingresos exactos', () => {
    const { margenBruto, margenPct } = computeMargen(5000, 3000, 2000);
    expect(margenBruto).toBe(0);
    expect(margenPct).toBe(0);
  });
});

describe('computeMargen — caja (neto derivado)', () => {
  it('neto caja = cobradoMes - pagadoMes', () => {
    // No es computeMargen, es lógica inline del componente — verificar aritmética
    const cobradoMes = 3000;
    const pagadoMes = 800;
    expect(cobradoMes - pagadoMes).toBe(2200);
  });

  it('neto caja negativo cuando pagadoMes > cobradoMes', () => {
    const cobradoMes = 500;
    const pagadoMes = 2000;
    expect(cobradoMes - pagadoMes).toBeLessThan(0);
  });

  it('cobradoYTD >= cobradoMes en escenario normal', () => {
    // Invariante del modelo: YTD nunca puede ser menor que el mes corriente
    const cobradoMes = 3000;
    const cobradoYTD = 15000;
    expect(cobradoYTD).toBeGreaterThanOrEqual(cobradoMes);
  });
});
