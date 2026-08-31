import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('VPS production env merge', () => {
  const source = readFileSync(resolve('scripts/merge-vps-production-env.sh'), 'utf8');

  it('never installs Vercel redaction markers as credentials', () => {
    expect(source).toContain('value != "[SENSITIVE]"');
    expect(source).toContain('value != "\\"[SENSITIVE]\\""');
    expect(source).toContain('El env resultante contiene marcadores [SENSITIVE]');
  });

  it('keeps VPS-owned database and storage settings', () => {
    expect(source).toMatch(/DATABASE_URL\|DATABASE_URL_UNPOOLED\|MIGRATION_DATABASE_URL/);
    expect(source).toMatch(/STORAGE_DRIVER\|STORAGE_LOCAL_ROOT\|STORAGE_PUBLIC_URL_BASE/);
  });

  it('does not make a Docker build impersonate Vercel', () => {
    expect(source).toContain('k == "VERCEL"');
    expect(source).toContain('k ~ /^VERCEL_/');
    expect(source).toContain('k ~ /^NOW_/');
  });
});
