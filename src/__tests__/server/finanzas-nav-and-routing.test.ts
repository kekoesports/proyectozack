/**
 * Contratos estructurales de la nueva navegación de Finanzas (PR 2 —
 * rediseño 2026-07-06). Ver `docs/finanzas-audit.md` §14.
 *
 * Verifica:
 *   - Las 9 tabs canónicas están en FinanzasNav.
 *   - Cada tab apunta a una ruta que existe.
 *   - Los redirects legacy están configurados.
 *   - Las páginas placeholder importan `PlaceholderSection`.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

describe('[finanzas-nav-and-routing] las 9 tabs canónicas', () => {
  const navSrc = read('src/app/admin/(dashboard)/finanzas/FinanzasNav.tsx');
  const EXPECTED_HREFS = [
    '/admin/finanzas/resumen',
    '/admin/finanzas/caja',
    '/admin/finanzas/ingresos',
    '/admin/finanzas/gastos',
    '/admin/finanzas/nominas-creadores',
    '/admin/finanzas/rentabilidad',
    '/admin/finanzas/documentos',
    '/admin/finanzas/informes',
    '/admin/finanzas/configuracion',
  ] as const;

  const EXPECTED_LABELS = [
    'Resumen', 'Caja', 'Ingresos', 'Gastos',
    'Nóminas y creadores', 'Rentabilidad', 'Documentos', 'Informes', 'Configuración',
  ] as const;

  it.each(EXPECTED_HREFS)('nav declara href %s', (href) => {
    expect(navSrc).toContain(`href: '${href}'`);
  });

  it.each(EXPECTED_LABELS)('nav declara label %s', (label) => {
    expect(navSrc).toContain(`label: '${label}'`);
  });

  it.each(EXPECTED_HREFS)('la ruta %s existe como page.tsx', (href) => {
    // Path filesystem: `/admin/*` en URL → `src/app/admin/(dashboard)/*`
    const suffix = href.replace(/^\/admin\//, '');
    const rel = `src/app/admin/(dashboard)/${suffix}/page.tsx`;
    expect(exists(rel)).toBe(true);
  });
});

describe('[finanzas-nav-and-routing] redirects legacy', () => {
  it('/admin/facturacion redirige a /admin/finanzas/ingresos', () => {
    const src = read('src/app/admin/(dashboard)/facturacion/page.tsx');
    expect(src).toMatch(/permanentRedirect\(['"]\/admin\/finanzas\/ingresos['"]\)/);
  });

  it('/admin/facturacion/dashboard redirige a /admin/finanzas/resumen', () => {
    const src = read('src/app/admin/(dashboard)/facturacion/dashboard/page.tsx');
    expect(src).toMatch(/permanentRedirect\(['"]\/admin\/finanzas\/resumen['"]\)/);
  });

  it('/admin/gastos redirige a /admin/finanzas/gastos', () => {
    const src = read('src/app/admin/(dashboard)/gastos/page.tsx');
    expect(src).toMatch(/permanentRedirect\(['"]\/admin\/finanzas\/gastos['"]\)/);
  });
});

describe('[finanzas-nav-and-routing] páginas placeholder usan PlaceholderSection', () => {
  // PR 5 (2026-07-06): `nominas-creadores` ya no es placeholder — pasó
  // a implementación real. Ver `finanzas-nominas-creadores.test.ts`.
  const PLACEHOLDER_ROUTES = [
    'caja',
    'rentabilidad',
    'documentos',
    'informes',
    'configuracion',
  ] as const;

  it.each(PLACEHOLDER_ROUTES)('%s importa PlaceholderSection', (route) => {
    const src = read(`src/app/admin/(dashboard)/finanzas/${route}/page.tsx`);
    expect(src).toMatch(/import\s*\{\s*PlaceholderSection\s*\}\s*from\s*['"]@\/features\/admin\/finance-dashboard\/components\/PlaceholderSection['"]/);
  });

  it.each(PLACEHOLDER_ROUTES)('%s requiere permission facturacion:read', (route) => {
    const src = read(`src/app/admin/(dashboard)/finanzas/${route}/page.tsx`);
    expect(src).toMatch(/requirePermission\(['"]facturacion['"],\s*['"]read['"]\)/);
  });
});

describe('[finanzas-nav-and-routing] /admin/finanzas/ingresos + gestor (PR 3 rediseño)', () => {
  // PR 3 (2026-07-06): /admin/finanzas/ingresos es una sección nueva
  // con KPIs + aging + tabla + top clientes. El compound antiguo se
  // preserva en /admin/finanzas/ingresos/gestor, accesible desde el
  // bloque "Accesos rápidos".
  it('/ingresos es la nueva sección PR 3 (usa getIngresosData)', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/ingresos/page.tsx');
    expect(src).toMatch(/import\s*\{\s*getIngresosData\s*\}/);
    expect(src).toMatch(/<IngresosKpisBlock/);
  });

  it('/ingresos/gestor hospeda IngresosCompoundPage (compound preservado)', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/ingresos/gestor/page.tsx');
    expect(src).toMatch(/import\s*\{\s*IngresosCompoundPage\s*\}\s*from\s*['"]@\/features\/admin\/invoices\/pages\/IngresosCompoundPage['"]/);
    expect(src).toMatch(/<IngresosCompoundPage\s+headerTitle=['"]Gestor de facturación['"]/);
  });
});
