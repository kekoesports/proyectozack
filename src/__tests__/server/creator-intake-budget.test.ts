import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { reserveIntakePilotRequest } from '@/lib/intake/pilot-budget';

it('preserves the original twenty reservations and permits only ten more concurrent calls', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'socialpro-intake-budget-test-'));
  try {
    for (let i = 0; i < 20; i++) expect(await reserveIntakePilotRequest(directory)).toBe(true);
    const original = await readdir(directory);
    const results = await Promise.all(Array.from({ length: 25 }, () => reserveIntakePilotRequest(directory)));
    expect(results.filter(Boolean)).toHaveLength(10);
    expect(await readdir(directory)).toHaveLength(30);
    expect((await readdir(directory)).filter((name) => original.includes(name))).toHaveLength(20);
    expect(await reserveIntakePilotRequest(directory)).toBe(false);
  } finally {
    if (!directory.startsWith(join(tmpdir(), 'socialpro-intake-budget-test-'))) throw new Error('Unexpected fixture path');
    await rm(directory, { recursive: true, force: true });
  }
});
it('fails closed with an unprovisioned or relative budget directory', async () => {
  expect(await reserveIntakePilotRequest('relative')).toBe(false);
  const directory = await mkdtemp(join(tmpdir(), 'socialpro-intake-budget-missing-'));
  try { expect(await reserveIntakePilotRequest(join(directory, 'not-created'))).toBe(false); }
  finally {
    if (!directory.startsWith(join(tmpdir(), 'socialpro-intake-budget-missing-'))) throw new Error('Unexpected fixture path');
    await rm(directory, { recursive: true, force: true });
  }
});
