/**
 * Test estático del módulo de permisos `contabilidad`.
 *
 * Se lee `src/lib/permissions.ts` como texto (no import) para evitar
 * cargar la cadena Better Auth. Es el mismo patrón que otros tests
 * estáticos del repo.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PERMISSIONS_FILE = path.join(ROOT, 'src/lib/permissions.ts');
const src = fs.readFileSync(PERMISSIONS_FILE, 'utf-8');

describe('permissions.contabilidad', () => {
  it('el módulo "contabilidad" está declarado en el union Module', () => {
    expect(src).toMatch(/\|\s*['"]contabilidad['"]/);
  });

  it('read está restringido a admin + admin_limited_tasks', () => {
    // Regex tolerante a espacios y comillas
    expect(src).toMatch(
      /contabilidad:\s*\{[^}]*read:\s*\[\s*['"]admin['"]\s*,\s*['"]admin_limited_tasks['"]\s*\]/
    );
  });

  it('el bloque "contabilidad" NO incluye finance/manager/staff/ops/analyst/brand/editor/talent_manager', () => {
    // Extrae solo el bloque del módulo contabilidad
    const m = /contabilidad:\s*\{([^}]*)\}/.exec(src);
    expect(m).not.toBeNull();
    const block = m?.[1] ?? '';
    for (const forbidden of ['finance', 'manager', 'staff', 'ops', 'analyst', 'brand', 'editor', 'talent_manager']) {
      expect(block).not.toMatch(new RegExp(`['"]${forbidden}['"]`));
    }
  });

  it('en PR 1 no define acciones write/delete/publish', () => {
    const m = /contabilidad:\s*\{([^}]*)\}/.exec(src);
    const block = m?.[1] ?? '';
    expect(block).not.toMatch(/\bwrite\s*:/);
    expect(block).not.toMatch(/\bdelete\s*:/);
    expect(block).not.toMatch(/\bpublish\s*:/);
  });
});
