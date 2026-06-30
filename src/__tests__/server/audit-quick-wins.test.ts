/**
 * Tests estáticos para los quick wins aprobados de la auditoría 2026-06-30.
 *
 * Cubren:
 *   - P1-03: JSON-LD logo de marca usa URL absoluta (no relativa al proxy)
 *   - P2-06: campanas/page.tsx ya no usa array hardcoded de roles
 *   - P3-03: OG image de giveaway muestra /codigos (no /giveaways legacy)
 *
 * P1-01 (redirects EN) NO se modifica porque las páginas EN se sirven en
 * /talents, /services, /contact via route group (en)/ — los redirects
 * /en/talents → /talents son correctos.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

describe('Quick wins auditoría — verificación estática', () => {
  // ── P1-03 ────────────────────────────────────────────────────────────────

  describe('[P1-03] marcas/[brandSlug] JSON-LD usa URL absoluta para logo', () => {
    const src = read('src/app/marcas/[brandSlug]/page.tsx');

    it('envuelve brand.logoUrl con absoluteUrl() o detecta http:// para preservar absolutas', () => {
      // El bloque debe contener una expresión que normalice la URL antes de pasarla al schema.
      // Patrón aceptado: brand.logoUrl.startsWith('http') ? brand.logoUrl : absoluteUrl(brand.logoUrl)
      expect(src).toMatch(/brand\.logoUrl\.startsWith\(['"]http['"]\)\s*\?\s*brand\.logoUrl\s*:\s*absoluteUrl\(\s*brand\.logoUrl\s*\)/);
    });

    it('NO contiene el patrón legacy "url: brand.logoUrl" sin normalizar', () => {
      // Match exacto del patrón antiguo: "url: brand.logoUrl }"
      expect(src).not.toMatch(/url:\s*brand\.logoUrl\s*\}/);
    });
  });

  // ── P2-06 ────────────────────────────────────────────────────────────────

  describe('[P2-06] admin/campanas/page.tsx usa ASSIGNABLE_TEAM_ROLES', () => {
    const src = read('src/app/admin/(dashboard)/campanas/page.tsx');

    it('importa ASSIGNABLE_TEAM_ROLES desde @/lib/team-roles', () => {
      expect(src).toMatch(/from\s+['"]@\/lib\/team-roles['"]/);
      expect(src).toMatch(/\bASSIGNABLE_TEAM_ROLES\b/);
    });

    it('NO contiene el array hardcoded de roles', () => {
      expect(src).not.toMatch(/\[\s*['"]admin['"]\s*,\s*['"]admin_limited_tasks['"]\s*,\s*['"]manager['"]\s*,\s*['"]staff['"]\s*\]/);
    });
  });

  // ── P3-03 ────────────────────────────────────────────────────────────────

  describe('[P3-03] OG image de giveaway usa /codigos (no /giveaways)', () => {
    const src = read('src/app/api/og-image/giveaway/route.tsx');

    it('el footer renderiza "socialpro.es/codigos"', () => {
      expect(src).toMatch(/socialpro\.es\/codigos/);
    });

    it('NO contiene la URL legacy "socialpro.es/giveaways" en el footer del template visual', () => {
      // El nombre "giveaways" puede aparecer en la consulta SQL (FROM giveaways g) y
      // está permitido. Solo verificamos que NO esté en el template visual del footer.
      const footerSection = /padding:\s*['"]0 72px 24px 80px['"][\s\S]{0,800}/.exec(src);
      expect(footerSection).toBeTruthy();
      const footerText = footerSection?.[0] ?? '';
      expect(footerText).not.toMatch(/socialpro\.es\/giveaways/);
    });
  });
});
