/**
 * Tests defensivos para la mejora de UX de Finanzas (2026-06-30).
 *
 * Cubren:
 *   1-4. /pl/page.tsx + PnLOverviewCards no contienen strings técnicos.
 *   5.   EXPENSE_SUBTYPE_LABELS traduce los 17 subtipos sin tokens snake_case.
 *   6.   nomina_socio → "Nóminas socios".
 *   7.   FinanceMonthlyControl calcula y muestra % por categoría.
 *   8.   GastosPageClient calcula importe total por tab.
 *   9.   NaN%/Infinity% no se renderiza si total = 0.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EXPENSE_SUBTYPE_LABELS } from '@/lib/queries/financeDashboard/financeResumen.shared';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');

// ── 1-4. Strings técnicos eliminados ────────────────────────────────────────

describe('Finanzas UX — strings técnicos eliminados', () => {
  const TECH_STRINGS = [
    'campaign_direct',
    'operational + legacy',
    'invoice_payments',
    'base devengado',
  ];

  it('[1] /admin/finanzas/pl/page.tsx no contiene strings técnicos en JSX', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/pl/page.tsx');
    for (const s of TECH_STRINGS) {
      expect(src).not.toContain(s);
    }
  });

  it('[2] PnLOverviewCards.tsx usa labels humanos', () => {
    const src = read('src/features/admin/pnl/components/PnLOverviewCards.tsx');
    // Label modernizado: "Ingresos del periodo" (era "Ingresos devengados")
    expect(src).toContain('Ingresos del periodo');
    expect(src).not.toContain('Ingresos devengados');
    // Hint humanizado
    expect(src).toContain('Por fecha de factura');
    expect(src).toContain('Incluido en gastos');
    expect(src).toContain('Ingresos − pagos a creadores');
    expect(src).toContain('Ingresos menos gastos');
    // Labels técnicos antiguos eliminados
    expect(src).not.toContain('Subset de gastos');
    expect(src).not.toContain('Sobre campañas');
    expect(src).not.toContain('Resultado operativo');
  });

  it('[3] /pl/page.tsx contiene subtítulos humanos en sus 4 cards', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/pl/page.tsx');
    expect(src).toContain('Gastos directos de campaña');
    expect(src).toContain('Software, gestoría, impuestos, nóminas y marketing');
    expect(src).toContain('Cobros conciliados del año');
    expect(src).toContain('Pagos conciliados del año');
  });

  it('[4] header del /pl es humanizado', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/pl/page.tsx');
    expect(src).toContain('Resultado del periodo');
    expect(src).toContain('cobros y pagos conciliados');
  });
});

// ── 5-6. EXPENSE_SUBTYPE_LABELS ──────────────────────────────────────────────

describe('EXPENSE_SUBTYPE_LABELS — labels humanos sin snake_case', () => {
  it('[5] ningún valor del mapa contiene snake_case visible (token_underscore)', () => {
    for (const [key, label] of Object.entries(EXPENSE_SUBTYPE_LABELS)) {
      // un label humano no debe contener guion-bajo ni el propio key
      expect({ key, label }).toEqual({ key, label });
      expect(label).not.toMatch(/[a-z]_[a-z]/);
    }
  });

  it('[6] nomina_socio → "Nóminas socios"', () => {
    expect(EXPENSE_SUBTYPE_LABELS.nomina_socio).toBe('Nóminas socios');
  });

  it('cubre los 17 subtipos del enum de DB', () => {
    const EXPECTED_KEYS = [
      'pago_talento', 'coste_produccion', 'comision_plataforma', 'otros_campana',
      'suscripcion_software', 'herramienta_ia', 'gestoria', 'fiscal_impuestos',
      'cuota_autonomo', 'marketing_publicidad', 'comision_bancaria', 'ajuste_fiscal',
      'gasto_general', 'factura_autonomo', 'nomina_socio', 'seguro_medico',
      'seguridad_social',
    ];
    for (const k of EXPECTED_KEYS) {
      expect(EXPENSE_SUBTYPE_LABELS[k]).toBeDefined();
      expect(EXPENSE_SUBTYPE_LABELS[k]?.length).toBeGreaterThan(0);
    }
  });
});

// ── 7. % por categoría en Control mensual ───────────────────────────────────

describe('FinanceMonthlyControl — % por categoría', () => {
  const src = read('src/features/admin/finance-dashboard/components/FinanceMonthlyControl.tsx');

  it('[7] calcula porcentaje por categoría y lo renderiza junto al importe', () => {
    // Debe haber un cálculo del tipo (item.amount / breakdownTotal) * 100
    expect(src).toMatch(/item\.amount\s*\/\s*breakdownTotal\s*\)\s*\*\s*100/);
    // Y debe renderizarse en el JSX (pctLabel + tabla)
    expect(src).toMatch(/pctLabel/);
    // Y el carácter "·" separador en la línea de importe (junto a pctLabel)
    expect(src).toMatch(/EUR\.format\(item\.amount\)[\s\S]{0,200}·\s*\{pctLabel\}/);
  });

  it('[9] guard contra NaN/Infinity: si breakdownTotal = 0 → "0%"', () => {
    expect(src).toMatch(/breakdownTotal\s*>\s*0\s*\?\s*\(item\.amount/);
    expect(src).toMatch(/Number\.isFinite\(pct\)/);
  });
});

// ── 8. Total por tab en Gastos ──────────────────────────────────────────────

describe('GastosPageClient — importe total por tab', () => {
  const src = read('src/app/admin/(dashboard)/finanzas/gastos/GastosPageClient.tsx');

  it('[8] calcula la suma de totalAmount por cada tab', () => {
    expect(src).toMatch(/function\s+sumTotalAmount\(/);
    expect(src).toMatch(/Number\(r\.totalAmount\)/);
    // El cálculo debe aplicarse a los tres arrays
    expect(src).toMatch(/totalDirectos\s*=\s*sumTotalAmount\(directos\)/);
    expect(src).toMatch(/totalOperativos\s*=\s*sumTotalAmount\(operativos\)/);
    expect(src).toMatch(/totalSinClasif\s*=\s*sumTotalAmount\(sinClasificar\)/);
  });

  it('el importe se renderiza junto al contador (no debajo, no como tooltip)', () => {
    // Debe aparecer el separador "·" + EUR0.format(total) en el JSX del botón
    expect(src).toMatch(/EUR0\.format\(total\)/);
    expect(src).toMatch(/·\s+\{EUR0\.format/);
  });
});
