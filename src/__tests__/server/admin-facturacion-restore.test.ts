/**
 * Regresión — separación Facturación (operativo) vs Finanzas → Ingresos (análisis).
 *
 * Contexto: PR #212 (2026-07-06) colapsó Facturación bajo Finanzas → Ingresos
 * haciendo que `/admin/facturacion` redirigiera a `/admin/finanzas/ingresos`.
 * Esto ocultó el flujo "crear factura" y mezcló módulos con propósitos distintos.
 * Restaurado en 2026-07-07 como módulo operativo propio.
 *
 * Estos tests fallan si el redirect original vuelve a introducirse o si el
 * gestor deja de estar accesible desde la URL canónica.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

describe('Facturación restaurada como módulo operativo propio', () => {
  it('/admin/facturacion NO redirige a /admin/finanzas/*', () => {
    const src = read('src/app/admin/(dashboard)/facturacion/page.tsx');
    expect(src).not.toMatch(/permanentRedirect\s*\(\s*['"`]\/admin\/finanzas/);
    expect(src).not.toMatch(/redirect\s*\(\s*['"`]\/admin\/finanzas/);
  });

  it('/admin/facturacion renderiza IngresosCompoundPage', () => {
    const src = read('src/app/admin/(dashboard)/facturacion/page.tsx');
    expect(src).toMatch(/IngresosCompoundPage/);
  });

  it('/admin/facturacion pasa headerTitle "Facturación" al compound page', () => {
    const src = read('src/app/admin/(dashboard)/facturacion/page.tsx');
    expect(src).toMatch(/headerTitle=["']Facturación["']/);
  });
});

describe('/admin/finanzas/ingresos/gestor redirige a /admin/facturacion', () => {
  it('sirve permanentRedirect hacia la URL canónica', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/ingresos/gestor/page.tsx');
    expect(src).toMatch(/permanentRedirect\s*\(\s*['"`]\/admin\/facturacion['"`]\s*\)/);
  });

  it('no renderiza el compound page directamente (evita duplicación de URLs)', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/ingresos/gestor/page.tsx');
    expect(src).not.toMatch(/IngresosCompoundPage/);
  });
});

describe('FinanzasNav — Ingresos ya no reclama /admin/facturacion como propio', () => {
  it('tab Ingresos no lista /admin/facturacion en extraPaths', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/FinanzasNav.tsx');
    // Localiza el bloque del tab Ingresos y verifica que no cita facturacion como extraPath
    const ingresosBlock = src.match(
      /href:\s*['"]\/admin\/finanzas\/ingresos['"][\s\S]*?\},/,
    )?.[0];
    expect(ingresosBlock).toBeDefined();
    expect(ingresosBlock).not.toMatch(/extraPaths[\s\S]*['"]\/admin\/facturacion['"]/);
  });
});
