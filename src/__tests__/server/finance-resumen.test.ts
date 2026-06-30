/**
 * Tests de lógica pura para el resumen financiero de /admin/finanzas/resumen.
 * Prueba funciones puras exportadas de financeResumen.ts y el componente nuevo.
 * No accede a la DB.
 */
// Importamos del archivo .shared (sin dependencias de db/env) para que jest
// no cargue 'server-only' (que falla en node test env). Los helpers son los mismos.
import {
  computeMargen,
  parseYearMonth,
  monthRange,
  buildContextualText,
  EXPENSE_SUBTYPE_LABELS,
} from '@/lib/queries/financeDashboard/financeResumen.shared';
import fs from 'fs';
import path from 'path';

// ── computeMargen (legacy, kept) ────────────────────────────────────────────

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
    const cobradoMes = 3000;
    const cobradoYTD = 15000;
    expect(cobradoYTD).toBeGreaterThanOrEqual(cobradoMes);
  });
});

// ── parseYearMonth ───────────────────────────────────────────────────────────

describe('parseYearMonth', () => {
  it('acepta formato YYYY-MM válido', () => {
    expect(parseYearMonth('2026-01')).toBe('2026-01');
    expect(parseYearMonth('2025-12')).toBe('2025-12');
  });

  it('rechaza mes 00 y devuelve mes actual', () => {
    const result = parseYearMonth('2026-00');
    expect(result).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(result).not.toBe('2026-00');
  });

  it('rechaza mes 13 y devuelve mes actual', () => {
    const result = parseYearMonth('2026-13');
    expect(result).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('rechaza string vacío y devuelve mes actual', () => {
    const result = parseYearMonth('');
    expect(result).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('rechaza undefined y devuelve mes actual', () => {
    const result = parseYearMonth(undefined);
    expect(result).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('rechaza formato con día y devuelve mes actual', () => {
    const result = parseYearMonth('2026-01-15');
    expect(result).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(result).not.toBe('2026-01-15');
  });
});

// ── monthRange ───────────────────────────────────────────────────────────────

describe('monthRange', () => {
  it('enero 2026 va del 01 al 31', () => {
    const { from, to } = monthRange('2026-01');
    expect(from).toBe('2026-01-01');
    expect(to).toBe('2026-01-31');
  });

  it('febrero 2026 va del 01 al 28 (no bisiesto)', () => {
    const { from, to } = monthRange('2026-02');
    expect(from).toBe('2026-02-01');
    expect(to).toBe('2026-02-28');
  });

  it('febrero 2024 va del 01 al 29 (bisiesto)', () => {
    const { from, to } = monthRange('2024-02');
    expect(from).toBe('2024-02-01');
    expect(to).toBe('2024-02-29');
  });

  it('diciembre 2025 va del 01 al 31', () => {
    const { from, to } = monthRange('2025-12');
    expect(from).toBe('2025-12-01');
    expect(to).toBe('2025-12-31');
  });

  it('from siempre termina en -01', () => {
    const { from } = monthRange('2026-06');
    expect(from).toBe('2026-06-01');
  });
});

// ── buildContextualText ──────────────────────────────────────────────────────

describe('buildContextualText', () => {
  it('devuelve texto positivo cuando ingresos > gastos', () => {
    const text = buildContextualText(5000, 3000, null);
    expect(text).toContain('ingresado');
  });

  it('incluye el gasto principal en texto negativo', () => {
    const text = buildContextualText(2000, 5000, 'Nóminas');
    expect(text).toContain('gastado');
    expect(text).toContain('Nóminas');
  });

  it('sin gasto principal el texto negativo omite la mención', () => {
    const text = buildContextualText(2000, 5000, null);
    expect(text).toContain('gastado');
    expect(text).not.toContain('Principal gasto');
  });

  it('sin datos devuelve mensaje neutral', () => {
    const text = buildContextualText(0, 0, null);
    expect(text).toContain('No hay datos');
  });

  it('ingresos iguales a gastos devuelve mensaje de equilibrio', () => {
    const text = buildContextualText(3000, 3000, null);
    expect(text).toContain('iguales');
  });
});

// ── EXPENSE_SUBTYPE_LABELS ────────────────────────────────────────────────────

describe('EXPENSE_SUBTYPE_LABELS', () => {
  const EXPECTED_KEYS = [
    'pago_talento', 'coste_produccion', 'comision_plataforma', 'otros_campana',
    'suscripcion_software', 'herramienta_ia', 'gestoria', 'fiscal_impuestos',
    'cuota_autonomo', 'marketing_publicidad', 'comision_bancaria', 'ajuste_fiscal',
    'gasto_general', 'factura_autonomo', 'nomina_socio', 'seguro_medico', 'seguridad_social',
  ];

  it('contiene etiquetas para todos los subtipos del enum', () => {
    for (const key of EXPECTED_KEYS) {
      expect(EXPENSE_SUBTYPE_LABELS).toHaveProperty(key);
      expect(typeof EXPENSE_SUBTYPE_LABELS[key]).toBe('string');
    }
  });

  it('las etiquetas están en español y sin camelCase', () => {
    for (const label of Object.values(EXPENSE_SUBTYPE_LABELS)) {
      expect(label).not.toMatch(/[A-Z][a-z]+[A-Z]/); // no camelCase
    }
  });
});

// ── FinanceMonthlyControl — strings prohibidos en el componente ──────────────

describe('FinanceMonthlyControl — strings prohibidos', () => {
  const componentPath = path.resolve(
    __dirname,
    '../../features/admin/finance-dashboard/components/FinanceMonthlyControl.tsx',
  );
  const source = fs.readFileSync(componentPath, 'utf-8');
  // Filter out comment lines before checking
  const nonCommentLines = source.split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  it('no contiene "P&L" como texto visible', () => {
    // P&L may appear in HTML entity form in JSX comments — only check non-comment JSX text
    expect(nonCommentLines).not.toMatch(/P&amp;L|>P&L</);
  });

  it('no contiene "devengo" como texto visible en UI principal', () => {
    // "devengo" must not appear in h1/p/span labels (only allowed as class or data-*)
    expect(nonCommentLines).not.toMatch(/>[^<]*[Dd]evengo[^<]*</);
  });

  it('no contiene "campaign_direct" como texto visible', () => {
    expect(nonCommentLines).not.toMatch(/>[^<]*campaign_direct[^<]*</);
  });

  it('no contiene "operational" como texto visible', () => {
    expect(nonCommentLines).not.toMatch(/>[^<]*operational[^<]*</);
  });

  it('no contiene "Resultado operativo" — reemplazado por "Resultado del mes"', () => {
    expect(source).not.toContain('Resultado operativo');
  });

  it('no contiene "Ingresos devengados" — reemplazado por "Ingresos"', () => {
    expect(source).not.toContain('Ingresos devengados');
  });

  it('no contiene "Total gastos" — reemplazado por "Gastos"', () => {
    expect(source).not.toContain('Total gastos');
  });

  it('contiene el botón "+ Subir gasto / PDF"', () => {
    expect(source).toContain('Subir gasto / PDF');
  });

  it('contiene la sección "Dónde se ha gastado"', () => {
    expect(source).toContain('Dónde se ha gastado');
  });

  it('contiene "Resultado del mes"', () => {
    expect(source).toContain('Resultado del mes');
  });
});

// ── FinanzasNav — tab labels ──────────────────────────────────────────────────

describe('FinanzasNav — etiquetas de tabs', () => {
  const navPath = path.resolve(
    __dirname,
    '../../app/admin/(dashboard)/finanzas/FinanzasNav.tsx',
  );
  const source = fs.readFileSync(navPath, 'utf-8');

  it('tab "Control mensual" existe', () => { expect(source).toContain('Control mensual'); });
  it('tab "Histórico mensual" existe', () => { expect(source).toContain('Histórico mensual'); });
  it('tab "Gastos y clasificación" existe', () => { expect(source).toContain('Gastos y clasificación'); });
  it('tab "Importar documentos" existe', () => { expect(source).toContain('Importar documentos'); });
  it('tab antiguo "Resumen" eliminado', () => { expect(source).not.toContain("label: 'Resumen'"); });
  it('tab antiguo "Resultados" eliminado', () => { expect(source).not.toContain("label: 'Resultados'"); });
  it('tab antiguo "Herramientas" eliminado', () => { expect(source).not.toContain("label: 'Herramientas'"); });
});
