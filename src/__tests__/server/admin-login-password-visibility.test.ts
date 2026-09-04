import fs from 'node:fs';
import path from 'node:path';

describe('login del CRM', () => {
  it('permite mostrar y ocultar la contraseña de forma accesible', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/admin/login/page.tsx'),
      'utf8',
    );

    expect(source).toContain("type={showPassword ? 'text' : 'password'}");
    expect(source).toContain("'Mostrar contraseña'");
    expect(source).toContain("'Ocultar contraseña'");
    expect(source).toContain('aria-pressed={showPassword}');
    expect(source).toContain('autoComplete="current-password"');
  });
});
