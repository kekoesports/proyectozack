/**
 * Contratos estructurales de /admin/finanzas/nominas-creadores (PR 5).
 *
 * Verifica:
 *   1. Permission gate.
 *   2. Orden de bloques.
 *   3. Query nueva `getNominasCreadoresData` es read-only.
 *   4. Filtros por URL params.
 *   5. Discriminación de subtypes correcta.
 *   6. Tabs internos: Nóminas / Talentos.
 *   7. Sin nuevas Server Actions.
 *   8. Reutiliza `normalizeExpenseStatusForDisplay`.
 *   9. Copy prohibido.
 *  10. Aviso legacy sobre `paidAmount`.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[finanzas-nominas-creadores] estructura de la página', () => {
  const src = read('src/app/admin/(dashboard)/finanzas/nominas-creadores/page.tsx');

  it('requiere permiso facturacion:read', () => {
    expect(src).toMatch(/requirePermission\(['"]facturacion['"],\s*['"]read['"]\)/);
  });

  it('carga los datos con getNominasCreadoresData', () => {
    expect(src).toMatch(/import\s*\{[^}]*getNominasCreadoresData/);
    expect(src).toMatch(/getNominasCreadoresData\(/);
  });

  it('renderiza los 7 bloques en el orden esperado', () => {
    const idxHeader = src.indexOf('<header');
    const idxFilters = src.indexOf('<NominasFilters');
    const idxKpis = src.indexOf('<NominasKpisBlock');
    const idxLectura = src.indexOf('<NominasLecturaRapida');
    const idxCharts = src.indexOf('<NominasBreakdownCharts');
    const idxRankings = src.indexOf('<NominasTopRankings');
    const idxTabs = src.indexOf('<NominasTabsSwitcher');
    const idxAccesos = src.indexOf('<NominasAccesosRapidos');

    expect(idxHeader).toBeGreaterThan(-1);
    expect(idxFilters).toBeGreaterThan(idxHeader);
    expect(idxKpis).toBeGreaterThan(idxFilters);
    expect(idxLectura).toBeGreaterThan(idxKpis);
    expect(idxCharts).toBeGreaterThan(idxLectura);
    expect(idxRankings).toBeGreaterThan(idxCharts);
    expect(idxTabs).toBeGreaterThan(idxRankings);
    expect(idxAccesos).toBeGreaterThan(idxTabs);
  });

  it('parsea filtros por URL params', () => {
    for (const key of ['from', 'to', 'tipo', 'estado', 'persona', 'talento', 'marca']) {
      expect(src).toMatch(new RegExp(`firstParam\\(sp\\.${key}\\)`));
    }
  });
});

describe('[finanzas-nominas-creadores] getNominasCreadoresData read-only', () => {
  const src = read('src/lib/queries/financeDashboard/nominasCreadores.ts');

  it('marca el archivo server-only', () => {
    expect(src).toMatch(/^['"]server-only['"];/m);
  });

  it('no ejecuta insert/update/delete', () => {
    expect(src).not.toMatch(/db\.insert\(/);
    expect(src).not.toMatch(/db\.update\(/);
    expect(src).not.toMatch(/db\.delete\(/);
  });

  it('exporta el shape completo', () => {
    expect(src).toMatch(/export type NominasCreadoresData/);
    expect(src).toMatch(/export async function getNominasCreadoresData/);
  });

  it('discrimina subtypes correctamente', () => {
    expect(src).toMatch(/NOMINAS_SUBTYPES\s*=\s*\[[\s\S]{0,200}'nomina_socio'[\s\S]{0,200}'seguridad_social'[\s\S]{0,200}'cuota_autonomo'[\s\S]{0,200}'factura_autonomo'/);
    expect(src).toMatch(/TALENT_SUBTYPES\s*=\s*\[[\s\S]{0,60}'pago_talento'/);
  });
});

describe('[finanzas-nominas-creadores] Tabs y tablas', () => {
  it('NominasTabsSwitcher tiene tab "Nóminas internas" y "Pagos a talentos"', () => {
    const src = read('src/features/admin/finance-dashboard/components/nominas-creadores/NominasTabsSwitcher.tsx');
    expect(src).toMatch(/Nóminas internas/);
    expect(src).toMatch(/Pagos a talentos/);
  });

  it('NominasInternasTabla usa normalizeExpenseStatusForDisplay', () => {
    const src = read('src/features/admin/finance-dashboard/components/nominas-creadores/NominasInternasTabla.tsx');
    expect(src).toMatch(/normalizeExpenseStatusForDisplay/);
  });

  it('PagosTalentosTabla usa normalizeExpenseStatusForDisplay', () => {
    const src = read('src/features/admin/finance-dashboard/components/nominas-creadores/PagosTalentosTabla.tsx');
    expect(src).toMatch(/normalizeExpenseStatusForDisplay/);
  });

  it('PagosTalentosTabla muestra aviso legacy sobre paidAmount cuando aplica', () => {
    const src = read('src/features/admin/finance-dashboard/components/nominas-creadores/PagosTalentosTabla.tsx');
    expect(src).toMatch(/paidAmount.*legacy/i);
    expect(src).toMatch(/hasPaidAmountLegacy/);
  });

  it('columnas de nóminas internas: Persona, Periodo, Concepto, Tipo, Fecha, Importe, Estado, Doc', () => {
    const src = read('src/features/admin/finance-dashboard/components/nominas-creadores/NominasInternasTabla.tsx');
    for (const col of ['Persona', 'Periodo', 'Concepto', 'Tipo', 'Fecha', 'Importe', 'Estado', 'Doc']) {
      expect(src).toContain(`'${col}'`);
    }
  });

  it('columnas de pagos a talentos: Talento, Marca, Campaña, Concepto, Fecha, Importe, Estado, Método, Doc', () => {
    const src = read('src/features/admin/finance-dashboard/components/nominas-creadores/PagosTalentosTabla.tsx');
    for (const col of ['Talento', 'Marca', 'Campaña', 'Concepto', 'Fecha', 'Importe', 'Estado', 'Método', 'Doc']) {
      expect(src).toContain(`'${col}'`);
    }
  });
});

describe('[finanzas-nominas-creadores] no hay Server Actions nuevas', () => {
  const feature = 'src/features/admin/finance-dashboard/components/nominas-creadores';
  const files = fs.readdirSync(path.join(ROOT, feature));

  it.each(files)('%s no declara "use server"', (f) => {
    const src = read(`${feature}/${f}`);
    expect(src).not.toMatch(/^['"]use server['"];/m);
  });
});

describe('[finanzas-nominas-creadores] copy prohibido', () => {
  const FILES = [
    'src/app/admin/(dashboard)/finanzas/nominas-creadores/page.tsx',
    'src/features/admin/finance-dashboard/components/nominas-creadores/NominasKpis.tsx',
    'src/features/admin/finance-dashboard/components/nominas-creadores/NominasFilters.tsx',
    'src/features/admin/finance-dashboard/components/nominas-creadores/NominasLecturaRapida.tsx',
    'src/features/admin/finance-dashboard/components/nominas-creadores/NominasBreakdownCharts.tsx',
    'src/features/admin/finance-dashboard/components/nominas-creadores/NominasTopRankings.tsx',
    'src/features/admin/finance-dashboard/components/nominas-creadores/NominasInternasTabla.tsx',
    'src/features/admin/finance-dashboard/components/nominas-creadores/PagosTalentosTabla.tsx',
    'src/features/admin/finance-dashboard/components/nominas-creadores/NominasTabsSwitcher.tsx',
    'src/features/admin/finance-dashboard/components/nominas-creadores/NominasAccesosRapidos.tsx',
  ] as const;

  const FORBIDDEN = /\b(pasivo|activo corriente|asiento contable|devengo)\b/i;

  it.each(FILES)('%s no contiene jerga contable prohibida', (file) => {
    const src = read(file);
    expect(src).not.toMatch(FORBIDDEN);
  });
});
