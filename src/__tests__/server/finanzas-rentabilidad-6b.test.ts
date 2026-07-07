/**
 * Tests de PR 6B — Rentabilidad visual avanzada.
 *
 * Cubre:
 *   - computeRankings: marca por margen / marca por facturación / talento por coste /
 *     peores desviaciones. Clientes marcado como insuficiente (aparcado honesto).
 *   - computeCharts: ingresos vs costes top 15, margen por marca top 10, talentos top 10,
 *     distribución por bandas. Sin NaN. Empty states protegidos.
 *   - Componentes: RentabilidadRankings + RentabilidadCharts existen y montan.
 *   - Recharts se usa desde componente 'use client' (no rompe SSR).
 *   - Sigue sin mutaciones, sin migraciones, sin Server Actions.
 *   - Servicios sigue aparcado.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');

// ── Estática: no scope creep, sigue read-only ──────────────────────────

describe('Rentabilidad 6B — invariantes de PR 6A preservadas', () => {
  const QUERY = 'src/lib/queries/financeDashboard/rentabilidad.ts';

  it('sigue siendo server-only', () => {
    expect(read(QUERY)).toMatch(/['"]server-only['"]/);
  });

  it('no introduce mutaciones (insert/update/delete)', () => {
    const src = read(QUERY);
    expect(src).not.toMatch(/db\.insert\(/);
    expect(src).not.toMatch(/db\.update\(/);
    expect(src).not.toMatch(/db\.delete\(/);
  });

  it('no introduce Server Actions en la página', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/rentabilidad/page.tsx');
    expect(src).not.toMatch(/['"]use server['"]/);
  });

  it('sigue exigiendo facturacion:read', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/rentabilidad/page.tsx');
    expect(src).toMatch(/requirePermission\(['"]facturacion['"],\s*['"]read['"]\)/);
  });

  it('no crea migración nueva 011X', () => {
    const journal = read('drizzle/meta/_journal.json');
    expect(journal).toMatch(/"tag":\s*"0109_billing_clients_pdf_language"/);
    expect(journal).not.toMatch(/"tag":\s*"0110_/);
    expect(journal).not.toMatch(/"tag":\s*"0111_/);
  });
});

// ── Query: nuevos exports rankings + charts ────────────────────────────

describe('Rentabilidad 6B — query exporta rankings y charts', () => {
  const QUERY_SRC = read('src/lib/queries/financeDashboard/rentabilidad.ts');

  it('exporta tipos de rankings', () => {
    expect(QUERY_SRC).toMatch(/export type RentabilidadRankings/);
    expect(QUERY_SRC).toMatch(/export type RankingMarcaRow/);
    expect(QUERY_SRC).toMatch(/export type RankingTalentoRow/);
    expect(QUERY_SRC).toMatch(/export type RankingCampanaDesviacionRow/);
  });

  it('exporta tipos de charts', () => {
    expect(QUERY_SRC).toMatch(/export type RentabilidadCharts/);
    expect(QUERY_SRC).toMatch(/export type ChartIngresosVsCostesPoint/);
    expect(QUERY_SRC).toMatch(/export type ChartMargenPorMarcaPoint/);
    expect(QUERY_SRC).toMatch(/export type ChartTalentoCostePoint/);
    expect(QUERY_SRC).toMatch(/export type ChartDistribucionMargen/);
  });

  it('RentabilidadData incluye rankings y charts', () => {
    expect(QUERY_SRC).toMatch(/rankings:\s*RentabilidadRankings/);
    expect(QUERY_SRC).toMatch(/charts:\s*RentabilidadCharts/);
  });

  it('computeRankings marca clientesInsuficientes = true (honesto, no inventa)', () => {
    expect(QUERY_SRC).toMatch(/clientesInsuficientes:\s*true/);
  });

  it('rankings de marca solo se ordenan por margen si ingresosReales > 0', () => {
    // Protección contra NaN por división cuando no hay ingresos reales
    expect(QUERY_SRC).toMatch(/topMarcasPorMargen[\s\S]{0,200}filter\([\s\S]{0,80}ingresosReales\s*>\s*0/);
  });

  it('rankings de talento excluyen filas con costeReal = 0', () => {
    expect(QUERY_SRC).toMatch(/topTalentosPorCoste[\s\S]{0,600}filter\(\(t\)\s*=>\s*t\.costeReal\s*>\s*0\)/);
  });

  it('peores desviaciones excluyen null y positivos', () => {
    expect(QUERY_SRC).toMatch(/desviacionPct[\s\S]{0,120}!==\s*null[\s\S]{0,80}<\s*0/);
  });

  it('empty state: campaignRows.length === 0 devuelve rankings + charts vacíos', () => {
    expect(QUERY_SRC).toMatch(/rankings:\s*emptyRankings\(\)/);
    expect(QUERY_SRC).toMatch(/charts:\s*emptyCharts\(\)/);
  });
});

// ── Componente rankings ────────────────────────────────────────────────

describe('RentabilidadRankings — Bloque 1', () => {
  const REL = 'src/features/admin/finance-dashboard/components/rentabilidad/RentabilidadRankings.tsx';

  it('el componente existe', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, REL))).toBe(true);
  });

  it('renderiza los 4 rankings esperados', () => {
    const src = read(REL);
    expect(src).toMatch(/Top marcas por margen real/);
    expect(src).toMatch(/Top marcas por facturación asociada/);
    expect(src).toMatch(/Top talentos por coste real/);
    expect(src).toMatch(/Peores desviaciones/);
  });

  it('muestra ranking de clientes como aparcado honesto', () => {
    const src = read(REL);
    expect(src).toMatch(/Ranking de clientes/);
    expect(src).toMatch(/Datos insuficientes/);
    expect(src).toMatch(/no tiene un FK fiable/);
  });

  it('los items del ranking incluyen barra de progreso visual', () => {
    const src = read(REL);
    expect(src).toMatch(/function ProgressBar/);
  });

  it('las peores desviaciones enlazan al detalle de campaña', () => {
    const src = read(REL);
    expect(src).toMatch(/\/admin\/campanas\/\$\{row\.id\}/);
  });

  it('protege contra división por cero al calcular pct de barras', () => {
    const src = read(REL);
    expect(src).toMatch(/maxValue\s*>\s*0\s*\?/);
  });
});

// ── Componente charts ─────────────────────────────────────────────────

describe('RentabilidadCharts — Bloque 2', () => {
  const REL = 'src/features/admin/finance-dashboard/components/rentabilidad/RentabilidadCharts.tsx';

  it('el componente existe', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, REL))).toBe(true);
  });

  it('está marcado como client component (Recharts requiere DOM)', () => {
    const src = read(REL);
    expect(src).toMatch(/^['"]use client['"];/);
  });

  it('renderiza los 4 gráficos del brief PR 6B', () => {
    const src = read(REL);
    expect(src).toMatch(/Ingresos vs costes por campaña/);
    expect(src).toMatch(/Margen bruto por marca/);
    expect(src).toMatch(/Top talentos por coste real/);
    expect(src).toMatch(/Distribución de campañas por banda de margen/);
  });

  it('importa recharts (no otras libs de charting)', () => {
    const src = read(REL);
    expect(src).toMatch(/from\s+['"]recharts['"]/);
    expect(src).not.toMatch(/from\s+['"]chart\.js['"]/);
    expect(src).not.toMatch(/from\s+['"]d3['"]/);
  });

  it('usa ResponsiveContainer en todos los gráficos', () => {
    const src = read(REL);
    // 4 gráficos → al menos 4 ResponsiveContainer
    const matches = src.match(/<ResponsiveContainer/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('protege contra NaN con safeNumber en tick formatters y tooltips', () => {
    const src = read(REL);
    expect(src).toMatch(/function safeNumber/);
    expect(src).toMatch(/Number\.isFinite/);
  });

  it('cada card tiene empty state (isEmpty)', () => {
    const src = read(REL);
    // Al menos 4 usos del prop isEmpty
    const matches = src.match(/isEmpty=\{/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('los labels largos se truncan (no rompen el layout)', () => {
    const src = read(REL);
    expect(src).toMatch(/function truncateLabel/);
  });
});

// ── Servicios sigue aparcado ──────────────────────────────────────────

describe('Servicios sigue aparcado en PR 6B', () => {
  const REL = 'src/features/admin/finance-dashboard/components/rentabilidad/RentabilidadServicioAparcado.tsx';

  it('el bloque sigue existiendo', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, REL))).toBe(true);
  });

  it('sigue siendo informativo, no funcional', () => {
    const src = read(REL);
    expect(src).toMatch(/Aparcado/);
  });

  it('la página SÍ importa el bloque aparcado', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/rentabilidad/page.tsx');
    expect(src).toMatch(/RentabilidadServicioAparcado/);
  });
});

// ── Página monta los nuevos bloques ───────────────────────────────────

describe('Página /admin/finanzas/rentabilidad — nuevos bloques', () => {
  const src = read('src/app/admin/(dashboard)/finanzas/rentabilidad/page.tsx');

  it('importa RentabilidadRankingsBlock', () => {
    expect(src).toMatch(/RentabilidadRankingsBlock/);
  });

  it('importa RentabilidadChartsBlock', () => {
    expect(src).toMatch(/RentabilidadChartsBlock/);
  });

  it('los rankings van antes de la tabla', () => {
    const idxRankings = src.indexOf('<RentabilidadRankingsBlock');
    const idxTabla    = src.indexOf('<RentabilidadTabla');
    expect(idxRankings).toBeGreaterThan(-1);
    expect(idxTabla).toBeGreaterThan(-1);
    expect(idxRankings).toBeLessThan(idxTabla);
  });

  it('los gráficos van entre rankings y tabla', () => {
    const idxRankings = src.indexOf('<RentabilidadRankingsBlock');
    const idxCharts   = src.indexOf('<RentabilidadChartsBlock');
    const idxTabla    = src.indexOf('<RentabilidadTabla');
    expect(idxCharts).toBeGreaterThan(idxRankings);
    expect(idxCharts).toBeLessThan(idxTabla);
  });
});
