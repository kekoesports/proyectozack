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

  it('mantiene exactamente los mismos trabajos y horarios que Vercel', () => {
    expect([...scheduledOnVps].sort()).toEqual(
      vercel.crons.map((cron) => [cron.path, cron.schedule] as const).sort(),
    );
  });

  it('no reactiva el antiguo backup interno ni poll-live-status', () => {
    expect(scheduledOnVps.has('/api/cron/backup')).toBe(false);
    expect(scheduledOnVps.has('/api/cron/poll-live-status')).toBe(false);
  });
});
