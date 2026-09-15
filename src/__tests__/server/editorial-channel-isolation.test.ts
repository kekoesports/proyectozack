import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execute = promisify(execFile);

// PGlite uses native dynamic WASM imports. Isolate its Jest VM flag to this
// integration suite; the rest of npm test and application runtime stay unchanged.
it('passes the 12 PostgreSQL editorial separation scenarios in an isolated process', async () => {
  await execute(process.execPath, [
    '--experimental-vm-modules',
    resolve('node_modules/jest/bin/jest.js'),
    '--config', resolve('jest.editorial.config.cjs'), '--runInBand',
  ], { cwd: resolve('.'), timeout: 60_000, maxBuffer: 2_000_000, windowsHide: true });
}, 70_000);
