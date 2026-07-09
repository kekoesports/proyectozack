/**
 * Tests de /admin/finanzas/rentabilidad (PR 6A).
 *
 * Cubre:
 *   - La página exige facturacion:read.
 *   - La query es read-only (solo select en el archivo).
 *   - Cálculos: margen pactado, margen real, desviación.
 *   - Estado visual: rentable / bajo / negativo / sin_datos / sin_ejecucion_suficiente.
 *   - Regla anti-ruido: ingresos reales < 100 € → sin_ejecucion_suficiente.
 *   - Bloque "Rentabilidad por servicio" aparece como aparcado, no inventa datos.
 *   - Filtros query params tolerantes.
 *   - No hay migraciones ni mutaciones nuevas.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  classifyEstado,
  LOW_MARGIN_THRESHOLD,
  MIN_INCOME_FOR_CLASSIFICATION,
} from '@/lib/queries/financeDashboard/rentabilidad';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');

// ── Estática: seguridad + read-only + no scope creep ───────────────────

describe('Rentabilidad — página y query', () => {
  const PAGE = 'src/app/admin/(dashboard)/finanzas/rentabilidad/page.tsx';
  const QUERY = 'src/lib/queries/financeDashboard/rentabilidad.ts';

  it('la página exige facturacion:read', () => {
    const src = read(PAGE);
    expect(src).toMatch(/requirePermission\(['"]facturacion['"],\s*['"]read['"]\)/);
  });

  it('la página ya NO importa PlaceholderSection', () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/PlaceholderSection/);
  });

  it('la query es read-only (no ejecuta insert/update/delete)', () => {
    const src = read(QUERY);
    // Marker 'server-only' presente
    expect(src).toMatch(/['"]server-only['"]/);
    // Ninguna mutación Drizzle
    expect(src).not.toMatch(/db\.insert\(/);
    expect(src).not.toMatch(/db\.update\(/);
    expect(src).not.toMatch(/db\.delete\(/);
  });

  it('no introduce Server Actions nuevas', () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/['"]use server['"]/);
  });

  it('reutiliza el umbral LOW_MARGIN_THRESHOLD = 20 (Decisión 3)', () => {
    expect(LOW_MARGIN_THRESHOLD).toBe(20);
  });

  it('define el mínimo anti-ruido en 100 € (Decisión regla PR 6A)', () => {
    expect(MIN_INCOME_FOR_CLASSIFICATION).toBe(100);
  });
});

// ── Estática: bloque servicios aparcado ────────────────────────────────

describe('Rentabilidad — bloque "Servicios" aparcado (Decisión 2 = C)', () => {
  const COMP = 'src/features/admin/finance-dashboard/components/rentabilidad/RentabilidadServicioAparcado.tsx';

  it('el componente existe', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, COMP))).toBe(true);
  });

  it('renderiza el badge "Aparcado"', () => {
    const src = read(COMP);
    expect(src).toMatch(/Aparcado/);
  });

  it('menciona explícitamente la falta de clasificación estructurada', () => {
    const src = read(COMP);
    expect(src).toMatch(/clasificar campañas o\s*[\r\n]?\s*facturas por tipo de servicio de forma estructurada/);
  });

  it('NO usa category/concept/expense_subtype como proxy inventado', () => {
    const src = read(COMP);
    expect(src).not.toMatch(/expense_subtype|expenseSubtype/);
    expect(src).not.toMatch(/invoices\.category/);
    expect(src).not.toMatch(/invoices\.concept/);
  });
});

// ── Funcional: classifyEstado — todos los casos del brief ──────────────

describe('classifyEstado — estado visual según brief PR 6A', () => {
  it('amountBrand=0 y sin ingresos reales → sin_datos', () => {
    expect(classifyEstado({ amountBrand: 0, ingresosReales: 0, margenRealPct: null })).toBe('sin_datos');
  });

  it('ingresos reales < 100 → sin_ejecucion_suficiente (anti-ruido)', () => {
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 50,  margenRealPct: 40 })).toBe('sin_ejecucion_suficiente');
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 99,  margenRealPct: 20 })).toBe('sin_ejecucion_suficiente');
    // borde: 100 → ya se clasifica normal
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 100, margenRealPct: 40 })).toBe('rentable');
  });

  it('margenRealPct null aunque haya ingresos → sin_datos (edge)', () => {
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 5000, margenRealPct: null })).toBe('sin_datos');
  });

  it('margenRealPct < 0 → negativo', () => {
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 5000, margenRealPct: -12 })).toBe('negativo');
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 5000, margenRealPct: -0.1 })).toBe('negativo');
  });

  it('margen 0 ≤ x < 20 → bajo', () => {
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 5000, margenRealPct: 0 })).toBe('bajo');
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 5000, margenRealPct: 15 })).toBe('bajo');
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 5000, margenRealPct: 19.99 })).toBe('bajo');
  });

  it('margen >= 20 → rentable', () => {
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 5000, margenRealPct: 20 })).toBe('rentable');
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 5000, margenRealPct: 42 })).toBe('rentable');
  });

  it('amountBrand>0 y sin ingresos reales → cae a sin_ejecucion_suficiente', () => {
    expect(classifyEstado({ amountBrand: 5000, ingresosReales: 0, margenRealPct: null })).toBe('sin_ejecucion_suficiente');
  });
});

// ── Funcional: cálculo margen pactado / real / desviación ──────────────
//
// Estos tests inspeccionan el código para verificar las fórmulas del brief,
// evitando arrancar la DB. La query mezcla SQL y agregación en memoria; las
// fórmulas de margen en memoria son la parte crítica del cálculo.

describe('Fórmulas de margen — brief PR 6A', () => {
  const QUERY_SRC = read('src/lib/queries/financeDashboard/rentabilidad.ts');

  it('margen pactado usa amountBrand - amountTalent', () => {
    expect(QUERY_SRC).toMatch(/amountBrand\s*>\s*0\s*\?\s*round2\(amountBrand\s*-\s*amountTalent\)\s*:\s*null/);
  });

  it('margen pactado % divide entre amountBrand y multiplica por 100', () => {
    expect(QUERY_SRC).toMatch(/\(\(amountBrand\s*-\s*amountTalent\)\s*\/\s*amountBrand\)\s*\*\s*100/);
  });

  it('margen real usa ingresosReales - costesReales, null si ingresos=0', () => {
    expect(QUERY_SRC).toMatch(/agg\.ingresosReales\s*>\s*0\s*\?[\s\S]{0,200}round2\(agg\.ingresosReales\s*-\s*agg\.costesReales\)/);
  });

  it('desviación = margenReal% - margenPactado%, null si falta alguno', () => {
    expect(QUERY_SRC).toMatch(/margenPactadoPct\s*!==\s*null\s*&&\s*margenRealPct\s*!==\s*null[\s\S]{0,150}margenRealPct\s*-\s*margenPactadoPct/);
  });

  it('agregación de ingresos reales EXCLUYE anulada y borrador', () => {
    expect(QUERY_SRC).toMatch(/kind[^']*'income'[\s\S]{0,150}NOT IN\s*\(\s*'anulada'\s*,\s*'borrador'\s*\)/);
  });

  it('agregación de costes reales EXCLUYE anulada y borrador', () => {
    expect(QUERY_SRC).toMatch(/kind[^']*'expense'[\s\S]{0,150}NOT IN\s*\(\s*'anulada'\s*,\s*'borrador'\s*\)/);
  });

  it('pagos a talentos se filtran por expense_subtype = pago_talento', () => {
    expect(QUERY_SRC).toMatch(/expenseSubtype[^']*'pago_talento'/);
  });

  it('otros costes directos = coste_produccion + comision_plataforma + otros_campana', () => {
    expect(QUERY_SRC).toMatch(/'coste_produccion'\s*,\s*'comision_plataforma'\s*,\s*'otros_campana'/);
  });

  it('excluye campañas canceladas', () => {
    expect(QUERY_SRC).toMatch(/ne\(campaigns\.status,\s*['"]cancelada['"]\)/);
  });
});

// ── Estática: filtros query params ─────────────────────────────────────

describe('Filtros query params', () => {
  const PAGE = 'src/app/admin/(dashboard)/finanzas/rentabilidad/page.tsx';
  const src = read(PAGE);

  it('acepta from/to como ISO date con validación', () => {
    expect(src).toMatch(/ISO_DATE_RE/);
    expect(src).toMatch(/safeIsoDate/);
  });

  it('acepta marca/talento como positive int', () => {
    expect(src).toMatch(/safePosInt/);
    expect(src).toMatch(/\{\s*brandId\s*\}/);
    expect(src).toMatch(/\{\s*talentId\s*\}/);
  });

  it('acepta margen con enum validado y default "todos"', () => {
    expect(src).toMatch(/safeMargenFilter/);
    expect(src).toMatch(/MARGEN_VALID/);
  });

  it('rechaza estado de campaña no válido usando allowlist', () => {
    expect(src).toMatch(/CAMPAIGN_STATUS_VALID/);
  });
});

// ── Estática: no migraciones + no scope creep ──────────────────────────

describe('PR 6A — sin scope creep', () => {
  it('no toca src/db/schema/', () => {
    // Nada de esta PR debería aparecer en schemas
    const schemaFiles = ['campaigns.ts', 'invoices.ts'];
    for (const f of schemaFiles) {
      const src = read(`src/db/schema/${f}`);
      // Si por accidente añadimos una columna nueva relacionada con rentabilidad, este test fallará
      expect(src).not.toMatch(/rentabilidad|margen_real|profitability/i);
    }
  });

  it('no crea migración nueva del ámbito rentabilidad/pnl', () => {
    // Refactorizado tras 0110 (aditiva, otra PR): esta PR (rentabilidad 6A)
    // sólo debía ser query + UI — comprobamos que no aparece migración
    // relacionada con rentabilidad/pnl/margin en el journal.
    const journal = read('drizzle/meta/_journal.json');
    expect(journal).not.toMatch(/"tag":\s*"\d{4}_[^"]*(rentab|pnl|margin|profit)[^"]*"/i);
  });
});
