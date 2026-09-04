import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

type VercelCron = { readonly path: string; readonly schedule: string };

describe('scheduler VPS', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')) as {
    readonly crons: readonly VercelCron[];
  };
  const crontab = fs.readFileSync(path.join(ROOT, 'infra/crm/scheduler/crontab'), 'utf8');
  const scheduledOnVps = new Map<string, string>();

  for (const line of crontab.split(/\r?\n/)) {
    const match = line.match(/^\s*(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+.*\/api\/cron\/([a-z-]+)/);
    if (match?.[1] && match[2]) scheduledOnVps.set(`/api/cron/${match[2]}`, match[1]);
  }

  it('mantiene los trabajos heredados de Vercel con los mismos horarios', () => {
    const inheritedSchedules = [...scheduledOnVps]
      .filter(([path]) => path !== '/api/cron/poll-live-status');

    expect(inheritedSchedules.sort()).toEqual(
      vercel.crons.map((cron) => [cron.path, cron.schedule] as const).sort(),
    );
  });

  it('mantiene desactivado el antiguo backup interno', () => {
    expect(scheduledOnVps.has('/api/cron/backup')).toBe(false);
  });

  it('actualiza los directos de Twitch cada cinco minutos solo en el VPS', () => {
    expect(scheduledOnVps.get('/api/cron/poll-live-status')).toBe('*/5 * * * *');
    expect(vercel.crons.some((cron) => cron.path === '/api/cron/poll-live-status')).toBe(false);
  });
});
