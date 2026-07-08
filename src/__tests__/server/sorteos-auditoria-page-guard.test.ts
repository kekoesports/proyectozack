/**
 * Sorteos Fase 1 PR2 — la ruta `/admin/giveaways/auditoria` DEBE requerir
 * `sorteos:audit`. Nunca `sorteos:read` (permitiría staff/ops → fuga PII).
 *
 * Test estático source-scan: bloquea regresiones si alguien afloja el
 * guard sin querer.
 */

import * as fs from 'fs';
import * as path from 'path';

const PAGE_PATH = path.join(
  process.cwd(),
  'src/app/admin/(dashboard)/giveaways/auditoria/page.tsx',
);

describe('/admin/giveaways/auditoria — guard estático', () => {
  const source = fs.readFileSync(PAGE_PATH, 'utf8');

  it('existe el archivo de la página', () => {
    expect(fs.existsSync(PAGE_PATH)).toBe(true);
  });

  it('llama requirePermission("sorteos", "audit")', () => {
    expect(source).toMatch(/requirePermission\(\s*['"]sorteos['"]\s*,\s*['"]audit['"]/);
  });

  it('NO llama requirePermission("sorteos", "read") (evita permisos amplios)', () => {
    expect(source).not.toMatch(/requirePermission\(\s*['"]sorteos['"]\s*,\s*['"]read['"]/);
  });

  it('la página consume la query saneada `listAuditEvents`', () => {
    expect(source).toMatch(/listAuditEvents/);
  });

  it('la fila usa AuditoriaRow (que aplica redactAuditMetadata en render)', () => {
    expect(source).toMatch(/AuditoriaRow/);
  });

  it('no expone ipHash completo en la vista (delega a AuditoriaRow → truncateIpHash)', () => {
    const rowSource = fs.readFileSync(
      path.join(process.cwd(), 'src/app/admin/(dashboard)/giveaways/auditoria/AuditoriaRow.tsx'),
      'utf8',
    );
    expect(rowSource).toMatch(/truncateIpHash\(row\.ipHash\)/);
    expect(rowSource).toMatch(/redactAuditMetadata\(row\.metadata\)/);
    expect(rowSource).toMatch(/summarizeUserAgent\(row\.userAgent\)/);
  });

  it('la fila NO renderiza row.userAgent ni row.ipHash directamente sin helper', () => {
    const rowSource = fs.readFileSync(
      path.join(process.cwd(), 'src/app/admin/(dashboard)/giveaways/auditoria/AuditoriaRow.tsx'),
      'utf8',
    );
    // Simple heurística — {row.ipHash} o {row.userAgent} sin envolver debería estar ausente.
    expect(rowSource).not.toMatch(/\{row\.ipHash\}/);
    expect(rowSource).not.toMatch(/\{row\.userAgent\}/);
  });
});
