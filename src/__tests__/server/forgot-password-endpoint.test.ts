/**
 * Regression test — Better Auth 1.6.x expone `POST /api/auth/request-password-reset`,
 * no `/api/auth/forget-password`. La UI apuntaba al endpoint erróneo, recibía 404
 * y mostraba "revisa tu bandeja" sin haber enviado el email nunca.
 *
 * Test estructural: si alguien vuelve a introducir `forget-password` en la ruta
 * del fetch, este test cae y se detiene la regresión antes de deploy.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_PATH = resolve(process.cwd(), 'src/app/admin/forgot-password/page.tsx');
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');

describe('ForgotPasswordPage — endpoint correcto de Better Auth', () => {
  it('usa /api/auth/request-password-reset (endpoint canónico Better Auth 1.6.x)', () => {
    expect(SOURCE).toMatch(/['"]\/api\/auth\/request-password-reset['"]/);
  });

  it('NO usa /api/auth/forget-password (endpoint inexistente que devuelve 404)', () => {
    expect(SOURCE).not.toMatch(/['"]\/api\/auth\/forget-password['"]/);
  });

  it('propaga error si el fetch responde no-2xx (evita "éxito" silencioso)', () => {
    expect(SOURCE).toMatch(/if\s*\(\s*!\s*res\.ok\s*\)/);
  });
});
