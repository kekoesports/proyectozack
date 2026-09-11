/** Local synthetic browser harness. Never reads .env files; abort if this checkout has one. */
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { quickNotesFixture } from './quick-notes-fixture';
import { crmTasks, taskNoticeSettings } from '../src/db/schema';
async function main() {
  for (const name of [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local',
  ]) {
    const present = await access(name).then(
      () => true,
      () => false,
    );
    if (present) throw Error('Fixture refuses checkout containing env files');
  }
  const fixture = await quickNotesFixture(55442);
  await fixture.database
    .insert(crmTasks)
    .values({
      title: 'QA aviso vencido',
      ownerId: 'pablo-qa',
      assignedToUserId: 'pablo-qa',
      priority: 'alta',
      dueDate: '2026-01-01',
      category: 'General',
      weekLabel: '2026-W01',
    });
  await fixture.database
    .insert(taskNoticeSettings)
    .values({
      userId: 'pablo-qa',
      startHour: 0,
      endHour: 24,
      weekdaysOnly: false,
    });
  const system: NodeJS.ProcessEnv = {};
  for (const key of [
    'PATH',
    'Path',
    'SystemRoot',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'USERPROFILE',
    'LOCALAPPDATA',
    'APPDATA',
    'COMSPEC',
    'PATHEXT',
  ])
    if (process.env[key]) system[key] = process.env[key];
  const child = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'dev',
      '--webpack',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3451',
    ],
    {
      stdio: 'inherit',
      windowsHide: true,
      env: {
        ...system,
        DATABASE_URL:
          'postgresql://notes_fixture:notes_fixture@127.0.0.1:55442/notes_fixture',
        DB_POOL_MAX: '1',
        RESEND_API_KEY: 're_fixture_not_a_real_key',
        BETTER_AUTH_SECRET: 'quick-notes-isolated-fixture-secret-2026',
        NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3451',
        ENABLE_DEV_AUTH_BYPASS: 'false',
        QUICK_NOTES_ENABLED: 'true',
        CRON_SECRET: 'notes-fixture-cron-only',
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  );
  const stop = () => {
    child.kill();
    void fixture.close();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  child.once('exit', () => {
    void fixture.close().then(() => process.exit(0));
  });
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
