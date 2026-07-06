/**
 * Contratos estructurales de /admin/finanzas/ingresos (PR 3).
 *
 * Verifica:
 *   1. La página requiere `facturacion:read`.
 *   2. Renderiza los bloques en el orden esperado.
 *   3. La query nueva `getIngresosData` no ejecuta writes.
 *   4. La tabla mapea estados legacy con `normalizeInvoiceStatusForDisplay`.
 *   5. Filtros persistentes por URL params.
 *   6. Aviso `BankDataWarning` presente.
 *   7. Reutiliza `getArAging` sin duplicar lógica.
 *   8. Copy prohibido no aparece.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[finanzas-ingresos] estructura de la página', () => {
  const src = read('src/app/admin/(dashboard)/finanzas/ingresos/page.tsx');

  it('requiere permiso facturacion:read', () => {
    expect(src).toMatch(/requirePermission\(['"]facturacion['"],\s*['"]read['"]\)/);
  });

  it('carga los datos con getIngresosData', () => {
    expect(src).toMatch(/import\s*\{\s*getIngresosData\s*\}/);
    expect(src).toMatch(/getIngresosData\(/);
  });

  it('reutiliza BankDataWarning del resumen', () => {
    expect(src).toMatch(/import\s*\{\s*BankDataWarning\s*\}/);
    expect(src).toMatch(/<BankDataWarning/);
  });

  it('reutiliza ArAgingBuckets para el aging', () => {
    expect(src).toMatch(/import\s*\{\s*ArAgingBuckets\s*\}/);
    expect(src).toMatch(/<ArAgingBuckets\s+buckets=/);
  });

  it('renderiza los 6 bloques en el orden esperado', () => {
    const idxFilters = src.indexOf('<IngresosFilters');
    const idxKpis = src.indexOf('<IngresosKpisBlock');
    const idxBank = src.indexOf('<BankDataWarning');
    const idxAging = src.indexOf('<ArAgingBuckets');
    const idxTopClientes = src.indexOf('<TopClientesBloque');
    const idxTopMarcas = src.indexOf('<TopMarcasBloque');
    const idxTabla = src.indexOf('<IngresosTabla');
    const idxAccesos = src.indexOf('<IngresosAccesosRapidos');

    expect(idxFilters).toBeGreaterThan(-1);
    expect(idxKpis).toBeGreaterThan(idxFilters);
    expect(idxBank).toBeGreaterThan(idxKpis);
    expect(idxAging).toBeGreaterThan(idxBank);
    expect(idxTopClientes).toBeGreaterThan(idxAging);
    expect(idxTopMarcas).toBeGreaterThan(idxAging);
    expect(idxTabla).toBeGreaterThan(idxTopClientes);
    expect(idxAccesos).toBeGreaterThan(idxTabla);
  });

  it('parsea filtros por URL params (from/to/cliente/marca/estado/tipo)', () => {
    expect(src).toMatch(/firstParam\(sp\.from\)/);
    expect(src).toMatch(/firstParam\(sp\.to\)/);
    expect(src).toMatch(/firstParam\(sp\.cliente\)/);
    expect(src).toMatch(/firstParam\(sp\.marca\)/);
    expect(src).toMatch(/firstParam\(sp\.estado\)/);
    expect(src).toMatch(/firstParam\(sp\.tipo\)/);
  });
});

describe('[finanzas-ingresos] tabla usa normalizeInvoiceStatusForDisplay', () => {
  const src = read('src/features/admin/finance-dashboard/components/ingresos/IngresosTabla.tsx');

  it('importa el helper', () => {
    expect(src).toMatch(/normalizeInvoiceStatusForDisplay/);
  });

  it('lo llama en cada fila', () => {
    expect(src).toMatch(/normalizeInvoiceStatusForDisplay\(row\.status\)/);
  });

  it('usa la semántica del display, no colores hardcoded por status', () => {
    expect(src).toMatch(/INVOICE_STATUS_DISPLAY_SEMANTIC/);
  });
});

describe('[finanzas-ingresos] getIngresosData es read-only', () => {
  const src = read('src/lib/queries/financeDashboard/ingresos.ts');

  it('marca el archivo server-only', () => {
    expect(src).toMatch(/^['"]server-only['"];/m);
  });

  it('no ejecuta insert/update/delete', () => {
    expect(src).not.toMatch(/db\.insert\(/);
    expect(src).not.toMatch(/db\.update\(/);
    expect(src).not.toMatch(/db\.delete\(/);
  });

  it('reutiliza getArAging en lugar de duplicar la query', () => {
    expect(src).toMatch(/import\s*\{\s*getArAging\s*\}/);
    expect(src).toMatch(/getArAging\(/);
  });

  it('exporta el shape completo (kpis + aging + top clientes + top marcas)', () => {
    expect(src).toMatch(/export type IngresosData/);
    expect(src).toMatch(/export async function getIngresosData/);
  });
});

describe('[finanzas-ingresos] copy prohibido', () => {
  const FILES = [
    'src/app/admin/(dashboard)/finanzas/ingresos/page.tsx',
    'src/features/admin/finance-dashboard/components/ingresos/IngresosKpis.tsx',
    'src/features/admin/finance-dashboard/components/ingresos/IngresosFilters.tsx',
    'src/features/admin/finance-dashboard/components/ingresos/IngresosTabla.tsx',
    'src/features/admin/finance-dashboard/components/ingresos/TopClientesBloque.tsx',
    'src/features/admin/finance-dashboard/components/ingresos/TopMarcasBloque.tsx',
    'src/features/admin/finance-dashboard/components/ingresos/IngresosAccesosRapidos.tsx',
  ] as const;

  // Copy prohibido en el módulo Finanzas — solo permitido en Informes avanzados.
  const FORBIDDEN = /\b(pasivo|activo corriente|asiento contable|devengo)\b/i;

  it.each(FILES)('%s no contiene jerga contable prohibida', (file) => {
    const src = read(file);
    expect(src).not.toMatch(FORBIDDEN);
  });
});

describe('[finanzas-ingresos] no hay actions/writes nuevos', () => {
  const feature = 'src/features/admin/finance-dashboard/components/ingresos';
  const files = fs.readdirSync(path.join(ROOT, feature));

  it('no hay Server Actions en la carpeta ingresos', () => {
    for (const f of files) {
      const src = read(`${feature}/${f}`);
      expect(src).not.toMatch(/^['"]use server['"];/m);
    }
  });
});
