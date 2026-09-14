// Exercise the real transitive dependency used by Hyperframes, with disposable data.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import AdmZip from 'adm-zip';

for (const method of ['all', 'entry', 'async']) {
  test(`${method}: archive extraction cannot overwrite through a destination link`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'socialpro-zip-security-'));
    try {
      const target = join(root, 'target');
      const outside = join(root, 'outside');
      await mkdir(target);
      await mkdir(outside);
      await writeFile(join(outside, 'protected.txt'), 'ORIGINAL');
      // A junction exercises the parent-component escape on Windows without elevation.
      await symlink(outside, join(target, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
      const archive = new AdmZip();
      archive.addFile('linked/protected.txt', Buffer.from('OVERWRITTEN'));
      if (method === 'async') {
        await assert.rejects(new Promise((resolve, reject) => {
          archive.extractAllToAsync(target, true, false, (error) => error ? reject(error) : resolve());
        }), /file in the way/i);
      } else {
        assert.throws(() => method === 'all'
          ? archive.extractAllTo(target, true)
          : archive.extractEntryTo('linked/protected.txt', target, true, true), /file in the way/i);
      }
      assert.equal(await readFile(join(outside, 'protected.txt'), 'utf8'), 'ORIGINAL');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('ordinary archive extraction still works', async () => {
  const root = await mkdtemp(join(tmpdir(), 'socialpro-zip-valid-'));
  try {
    const archive = new AdmZip();
    archive.addFile('assets/readme.txt', Buffer.from('VALID'));
    archive.extractAllTo(root, true);
    assert.equal(await readFile(join(root, 'assets/readme.txt'), 'utf8'), 'VALID');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
