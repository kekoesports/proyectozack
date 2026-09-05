import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const script = readFileSync(resolve('scripts/assert-vercel-build-target.cjs'), 'utf8');
const config = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8'));

describe('legacy Vercel publication isolation', () => {
  test.each([undefined, '', 'master', 'stabilize/socialpro-2026-09-05', 'bad ref', '../master'])
    ('rejects blocked or ambiguous refs without importing application code (%s)', (branch) => {
      const processFixture = { env: { VERCEL_GIT_COMMIT_REF: branch }, stderr: { write: jest.fn() }, exitCode: 0 };
      runInNewContext(script, { process: processFixture });
      expect(processFixture.exitCode).toBe(1);
      expect(processFixture.stderr.write).toHaveBeenCalledTimes(1);
    });

  test('does not change the existing chain for an identified unrelated branch', () => {
    const processFixture = { env: { VERCEL_GIT_COMMIT_REF: 'feature/isolated-preview' }, stderr: { write: jest.fn() }, exitCode: 0 };
    runInNewContext(script, { process: processFixture });
    expect(processFixture.exitCode).toBe(0);
    expect(processFixture.stderr.write).not.toHaveBeenCalled();
  });

  test('blocks Git deployment and runs the guard before all legacy effects', () => {
    expect(config.git.deploymentEnabled).toEqual({ master: false, 'stabilize/socialpro-2026-09-05': false });
    expect(config.buildCommand).toBe('node scripts/assert-vercel-build-target.cjs && tsx scripts/migrate.ts && next build && tsx scripts/ping-indexnow.ts');
  });
});
