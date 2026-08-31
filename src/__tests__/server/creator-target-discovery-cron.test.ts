import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

type VercelCron = { readonly path: string; readonly schedule: string };

function read(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf-8');
}

describe('descubrimiento diario de creadores target', () => {
  const config = JSON.parse(read('vercel.json')) as { readonly crons?: readonly VercelCron[] };
  const matches = (config.crons ?? []).filter(
    (cron) => cron.path === '/api/cron/discover-creator-targets',
  );
  const route = read('src/app/api/cron/discover-creator-targets/route.ts');
  const service = read('src/lib/services/creatorTargetDiscovery.ts');

  it('se programa una sola vez cada mañana', () => {
    expect(matches).toHaveLength(1);
    expect(matches[0]?.schedule).toBe('30 6 * * *');
  });

  it('protege la ejecución con el secreto de cron', () => {
    expect(route).toMatch(/assertCronAuth\(request\)/);
    expect(route).toMatch(/if \(authError\) return authError/);
  });

  it('ejecuta el servicio multicanal y no expone errores internos', () => {
    expect(route).toMatch(/runCreatorTargetDiscovery\('scheduled'\)/);
    expect(service).toMatch(/Credenciales de plataforma no disponibles/);
    expect(service).toMatch(/No se pudo completar la consulta de esta plataforma/);
  });
});
