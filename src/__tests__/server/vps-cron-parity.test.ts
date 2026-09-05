import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

const ROOT = path.resolve(__dirname, '..', '..', '..');

const vercelCronsSchema = z.object({ crons: z.array(z.object({ path: z.string(), schedule: z.string() })) });
const PROFILE_POLL = '/api/cron/discover-creator-targets';

describe('scheduler VPS', () => {
  const vercel = vercelCronsSchema.parse(JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')));
  const crontab = fs.readFileSync(path.join(ROOT, 'infra/crm/scheduler/crontab'), 'utf8');
  const scheduledOnVps = new Map<string, string>();

  for (const line of crontab.split(/\r?\n/)) {
    const match = line.match(/^\s*(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+.*\/api\/cron\/([a-z-]+)/);
    if (match?.[1] && match[2]) scheduledOnVps.set(`/api/cron/${match[2]}`, match[1]);
  }

  it('mantiene intactos los otros horarios heredados, salvo los dos sondeos VPS explícitos', () => {
    // Live status is VPS-only. Creator discovery now polls due daily profiles instead of
    // forcing their configurable/local-time schedule to Vercel's legacy fixed UTC minute.
    const inheritedSchedules = [...scheduledOnVps]
      .filter(([path]) => path !== '/api/cron/poll-live-status' && path !== PROFILE_POLL);

    expect(inheritedSchedules.sort()).toEqual(
      vercel.crons.filter(cron => cron.path !== PROFILE_POLL).map((cron) => [cron.path, cron.schedule] as const).sort(),
    );
  });

  it('mantiene desactivado el antiguo backup interno', () => {
    expect(scheduledOnVps.has('/api/cron/backup')).toBe(false);
  });

  it('actualiza los directos de Twitch cada cinco minutos solo en el VPS', () => {
    expect(scheduledOnVps.get('/api/cron/poll-live-status')).toBe('*/5 * * * *');
    expect(vercel.crons.some((cron) => cron.path === '/api/cron/poll-live-status')).toBe(false);
  });

  it('sondea perfiles pendientes cada cinco minutos con una sola petición y timeout HTTP de 240s', () => {
    expect(scheduledOnVps.get(PROFILE_POLL)).toBe('*/5 * * * *');
    const commands = crontab.split(/\r?\n/).filter(line => !line.trimStart().startsWith('#') && line.includes(PROFILE_POLL));
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatch(/\/usr\/bin\/curl -fsS -m 240 -H "Authorization: Bearer \$CRON_SECRET" http:\/\/app:3000\/api\/cron\/discover-creator-targets\s/);
    // This checks a client timeout, not cancellation of an already running server-side batch.
    expect(crontab).toContain('no cancela el trabajo del servidor');
    expect(vercel.crons.find(cron => cron.path === PROFILE_POLL)?.schedule).toBe('30 6 * * *');
  });
});
