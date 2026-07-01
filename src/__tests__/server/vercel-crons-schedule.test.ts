/**
 * Verifica que el schedule del endpoint `/api/cron/generate-recurring-expenses`
 * queda registrado en `vercel.json` y que la ruta sigue protegida por
 * `assertCronAuth` (CRON_SECRET Bearer).
 *
 * Motivo: hasta 2026-07-01 el endpoint existía pero no tenía schedule en
 * vercel.json → nunca se ejecutaba solo. Este test evita que un revert futuro
 * lo vuelva a dejar sin schedule sin darse cuenta.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

type VercelCron = { readonly path: string; readonly schedule: string };
type VercelConfig = { readonly crons?: readonly VercelCron[] };

function readVercelJson(): VercelConfig {
  const raw = fs.readFileSync(path.join(PROJECT_ROOT, 'vercel.json'), 'utf-8');
  return JSON.parse(raw) as VercelConfig;
}

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

describe('vercel.json — crons.generate-recurring-expenses', () => {
  const cfg = readVercelJson();
  const crons = cfg.crons ?? [];
  const target = crons.find((c) => c.path === '/api/cron/generate-recurring-expenses');

  it('vercel.json parsea como JSON válido', () => {
    expect(typeof cfg).toBe('object');
    expect(Array.isArray(crons)).toBe(true);
  });

  it('incluye una entrada para /api/cron/generate-recurring-expenses', () => {
    expect(target).toBeDefined();
  });

  it('schedule es un cron válido diario a las 03:00 UTC', () => {
    expect(target?.schedule).toBe('0 3 * * *');
  });

  it('no hay duplicados de path para el endpoint', () => {
    const matches = crons.filter((c) => c.path === '/api/cron/generate-recurring-expenses');
    expect(matches.length).toBe(1);
  });

  it('todos los paths de crons empiezan por /api/cron/', () => {
    for (const c of crons) {
      expect(c.path.startsWith('/api/cron/')).toBe(true);
    }
  });
});

describe('endpoint sigue protegido por CRON_SECRET', () => {
  const routeSrc = read('src/app/api/cron/generate-recurring-expenses/route.ts');
  const assertSrc = read('src/lib/security/assertCronAuth.ts');

  it('el route.ts sigue invocando assertCronAuth como primer guard', () => {
    expect(routeSrc).toMatch(/import\s+\{\s*assertCronAuth\s*\}\s+from\s+['"]@\/lib\/security\/assertCronAuth['"]/);
    expect(routeSrc).toMatch(/const\s+authError\s*=\s*assertCronAuth\(req\)/);
    expect(routeSrc).toMatch(/if\s*\(authError\)\s*return\s+authError/);
  });

  it('assertCronAuth exige Authorization: Bearer ${CRON_SECRET}', () => {
    expect(assertSrc).toMatch(/env\.CRON_SECRET/);
    expect(assertSrc).toMatch(/Bearer\s+\$\{cronSecret\}/);
    expect(assertSrc).toMatch(/timingSafeEqual/);
  });
});
