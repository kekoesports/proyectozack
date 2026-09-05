/**
 * homeForRole must only return routes that exist in the app router.
 * Broken homes send role-bounced users to 404 (CRM QA 2026-07-31).
 *
 * Structural (source) test — avoids importing auth-guard (pulls better-auth ESM).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
// Pure module is the source of truth (auth-guard re-exports it).
const AUTH_GUARD = path.join(ROOT, 'src/lib/home-for-role.ts');

function adminPageExists(urlPath: string): boolean {
  const suffix = urlPath.replace(/^\/admin\/?/, '');
  const rel = suffix
    ? `src/app/admin/(dashboard)/${suffix}/page.tsx`
    : 'src/app/admin/(dashboard)/page.tsx';
  return fs.existsSync(path.join(ROOT, rel));
}

function extractHome(role: string, src: string): string | null {
  // Match: if (role === 'finance') return '/admin/facturacion';
  const re = new RegExp(
    String.raw`if\s*\(\s*role\s*===\s*'${role}'\s*\)\s*return\s*'([^']+)'`,
  );
  const m = src.match(re);
  return m?.[1] ?? null;
}

describe('homeForRole (source contract)', () => {
  const src = fs.readFileSync(AUTH_GUARD, 'utf-8');

  it.each([
    ['admin', '/admin'],
    ['manager', '/admin'],
    ['admin_limited_tasks', '/admin'],
    ['staff', '/admin/mi-semana'],
    ['editor', '/admin/noticias'],
    ['finance', '/admin/facturacion'],
    ['analyst', '/admin/analytics'],
    ['ops', '/admin/tareas'],
    ['talent_manager', '/admin/talents'],
  ] as const)('%s → %s (route exists)', (role, expected) => {
    expect(extractHome(role, src)).toBe(expected);
    expect(adminPageExists(expected)).toBe(true);
  });

  it('brand → /marcas', () => {
    expect(extractHome('brand', src)).toBe('/marcas');
  });

  it('never returns the legacy broken paths', () => {
    expect(src).not.toMatch(/return\s*'\/admin\/facturas'/);
    expect(src).not.toMatch(/return\s*'\/admin\/agenda'/);
    expect(src).not.toMatch(/return\s*'\/admin\/talentos'/);
  });

  it('homeForRole is exported for reuse', () => {
    expect(src).toMatch(/export function homeForRole/);
  });

  it('auth-guard imports and re-exports homeForRole from pure module', () => {
    const guard = fs.readFileSync(path.join(ROOT, 'src/lib/auth-guard.ts'), 'utf-8');
    expect(guard).toMatch(/import \{ homeForRole \} from '@\/lib\/home-for-role'/);
    expect(guard).toMatch(/export \{ homeForRole \}/);
  });

  it('login page uses homeForRole instead of hardcoding /admin', () => {
    const login = fs.readFileSync(
      path.join(ROOT, 'src/components/ui/StaffLogin.tsx'),
      'utf-8',
    );
    expect(login).toMatch(/homeForRole/);
    expect(login).not.toMatch(/router\.push\('\/admin'\)/);
  });
});
