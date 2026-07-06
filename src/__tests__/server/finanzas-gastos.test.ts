/**
 * Contratos estructurales de /admin/finanzas/gastos (PR 4).
 *
 * Verifica:
 *   1. Permission gate.
 *   2. Orden de bloques.
 *   3. Query nueva `getGastosData` es read-only.
 *   4. Tabla usa `normalizeExpenseStatusForDisplay`.
 *   5. Filtros por URL params.
 *   6. Sugerencias asistidas NO se aplican automáticamente.
 *   7. Reutiliza actions existentes (facturacion:write) sin crear nuevas.
 *   8. Copy prohibido.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[finanzas-gastos] estructura de la página', () => {
  const src = read('src/app/admin/(dashboard)/finanzas/gastos/page.tsx');

  it('requiere permiso facturacion:read', () => {
    expect(src).toMatch(/requirePermission\(['"]facturacion['"],\s*['"]read['"]\)/);
  });

  it('carga los datos con getGastosData', () => {
    expect(src).toMatch(/import\s*\{\s*getGastosData\s*\}/);
    expect(src).toMatch(/getGastosData\(/);
  });

  it('renderiza los 8 bloques en el orden esperado', () => {
    const idxHeader = src.indexOf('<header');
    const idxFilters = src.indexOf('<GastosFilters');
    const idxKpis = src.indexOf('<GastosKpisBlock');
    const idxLectura = src.indexOf('<GastosLecturaRapida');
    const idxTopProv = src.indexOf('<GastosTopProveedoresBloque');
    const idxCharts = src.indexOf('<GastosBreakdownCharts');
    const idxSinClas = src.indexOf('<GastosSinClasificarBloque');
    const idxTabla = src.indexOf('<GastosTabla');
    const idxAccesos = src.indexOf('<GastosAccesosRapidos');

    expect(idxHeader).toBeGreaterThan(-1);
    expect(idxFilters).toBeGreaterThan(idxHeader);
    expect(idxKpis).toBeGreaterThan(idxFilters);
    expect(idxLectura).toBeGreaterThan(idxKpis);
    expect(idxTopProv).toBeGreaterThan(idxKpis);
    expect(idxCharts).toBeGreaterThan(idxLectura);
    expect(idxSinClas).toBeGreaterThan(idxCharts);
    expect(idxTabla).toBeGreaterThan(idxSinClas);
    expect(idxAccesos).toBeGreaterThan(idxTabla);
  });

  it('parsea filtros por URL params (desde/hasta/grupo/subtipo/estado/clasificacion/proveedor)', () => {
    expect(src).toMatch(/firstParam\(sp\.from\)/);
    expect(src).toMatch(/firstParam\(sp\.to\)/);
    expect(src).toMatch(/firstParam\(sp\.grupo\)/);
    expect(src).toMatch(/firstParam\(sp\.subtipo\)/);
    expect(src).toMatch(/firstParam\(sp\.estado\)/);
    expect(src).toMatch(/firstParam\(sp\.clasificacion\)/);
    expect(src).toMatch(/firstParam\(sp\.proveedor\)/);
  });
});

describe('[finanzas-gastos] getGastosData es read-only', () => {
  const src = read('src/lib/queries/financeDashboard/gastos.ts');

  it('marca el archivo server-only', () => {
    expect(src).toMatch(/^['"]server-only['"];/m);
  });

  it('no ejecuta insert/update/delete', () => {
    expect(src).not.toMatch(/db\.insert\(/);
    expect(src).not.toMatch(/db\.update\(/);
    expect(src).not.toMatch(/db\.delete\(/);
  });

  it('exporta el shape completo', () => {
    expect(src).toMatch(/export type GastosData/);
    expect(src).toMatch(/export async function getGastosData/);
  });
});

describe('[finanzas-gastos] tabla usa normalizeExpenseStatusForDisplay', () => {
  const src = read('src/features/admin/finance-dashboard/components/gastos/GastosTabla.tsx');
  it('importa y llama al normalize', () => {
    expect(src).toMatch(/normalizeExpenseStatusForDisplay/);
    expect(src).toMatch(/normalizeExpenseStatusForDisplay\(row\.status\)/);
  });
  it('usa la semántica del display, no colores hardcoded por status', () => {
    expect(src).toMatch(/EXPENSE_STATUS_DISPLAY_SEMANTIC/);
  });
});

describe('[finanzas-gastos] sugerencias NO se aplican automáticamente', () => {
  const suggestBloqueSrc = read('src/features/admin/finance-dashboard/components/gastos/GastosSinClasificarBloque.tsx');
  const helperSrc = read('src/lib/utils/expense-suggestion.ts');

  it('el helper documenta explícitamente que solo sugiere', () => {
    expect(helperSrc).toMatch(/Solo se sugiere, NUNCA se aplica autom/);
  });

  it('el bloque muestra "Sugerencias asistidas · no se aplican automáticamente"', () => {
    expect(suggestBloqueSrc).toMatch(/no se aplican automáticamente/i);
  });

  it('el bloque no llama a classifyExpensesAction ni updateExpenseClassificationAction directamente', () => {
    // Delegación en ExpensesClassifyTable (componente existente), no
    // llamadas nuevas desde el nuevo bloque.
    expect(suggestBloqueSrc).not.toMatch(/classifyExpensesAction\(/);
    expect(suggestBloqueSrc).not.toMatch(/updateExpenseClassificationAction\(/);
  });
});

describe('[finanzas-gastos] no hay Server Actions nuevas — reutiliza las existentes', () => {
  const feature = 'src/features/admin/finance-dashboard/components/gastos';
  const files = fs.readdirSync(path.join(ROOT, feature));

  it('ningún archivo del feature declara "use server"', () => {
    for (const f of files) {
      const src = read(`${feature}/${f}`);
      expect(src).not.toMatch(/^['"]use server['"];/m);
    }
  });

  it('las acciones existentes siguen requiriendo facturacion:write', () => {
    const actions = read('src/app/admin/(dashboard)/finanzas/finanzas-actions.ts');
    // Ambas acciones canónicas de clasificación existen y requieren write.
    expect(actions).toMatch(/export async function classifyExpensesAction/);
    expect(actions).toMatch(/export async function updateExpenseClassificationAction/);
    expect((actions.match(/requirePermission\(['"]facturacion['"],\s*['"]write['"]\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('[finanzas-gastos] copy prohibido', () => {
  const FILES = [
    'src/app/admin/(dashboard)/finanzas/gastos/page.tsx',
    'src/features/admin/finance-dashboard/components/gastos/GastosKpis.tsx',
    'src/features/admin/finance-dashboard/components/gastos/GastosFilters.tsx',
    'src/features/admin/finance-dashboard/components/gastos/GastosLecturaRapida.tsx',
    'src/features/admin/finance-dashboard/components/gastos/GastosBreakdownCharts.tsx',
    'src/features/admin/finance-dashboard/components/gastos/GastosSinClasificarBloque.tsx',
    'src/features/admin/finance-dashboard/components/gastos/GastosTopProveedores.tsx',
    'src/features/admin/finance-dashboard/components/gastos/GastosTabla.tsx',
    'src/features/admin/finance-dashboard/components/gastos/GastosAccesosRapidos.tsx',
  ] as const;

  const FORBIDDEN = /\b(pasivo|activo corriente|asiento contable|devengo)\b/i;

  it.each(FILES)('%s no contiene jerga contable prohibida', (file) => {
    const src = read(file);
    expect(src).not.toMatch(FORBIDDEN);
  });
});
