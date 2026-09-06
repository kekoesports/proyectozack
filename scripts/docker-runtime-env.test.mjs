import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';
import test from 'node:test';

// Execute the exact dependency-free image check with a synthetic directory
// reader; do not load native OCR packages or inspect a real environment file.
const source = await readFile(new URL('./docker-runtime-smoke.mjs', import.meta.url), 'utf8');
const start = source.indexOf('async function assertNoBundledEnvironment(');
const end = source.indexOf('\nclass DOMMatrixStub', start);
assert.ok(start > 0 && end > start);
const execute = new (Object.getPrototypeOf(async function () {}).constructor)(
  'readdir', 'join', 'assert', source.slice(start, end),
);
const entry = (name, directory = false) => ({ name, isDirectory: () => directory });
async function check(tree) {
  const visited = [];
  await execute(async directory => {
    visited.push(directory);
    assert.ok(Object.hasOwn(tree, directory), 'unexpected directory');
    return tree[directory];
  }, posix.join, (condition, message) => assert.ok(condition, message));
  return visited;
}

test('clean standalone recursively checked', async () => {
  assert.deepEqual(await check({ '/app': [entry('server.js'), entry('.next', true)], '/app/.next': [entry('cache', true)], '/app/.next/cache': [] }),
    ['/app', '/app/.next', '/app/.next/cache']);
});
test('root dotenv rejected without opening it', async () => {
  await assert.rejects(check({ '/app': [entry('.env.production')] }), /dotenv/);
});
test('nested dotenv artifact rejected', async () => {
  await assert.rejects(check({ '/app': [entry('.next', true)], '/app/.next': [entry('.env.local')] }), /dotenv/);
});
test('dotenv directory or symlink-like entry rejected', async () => {
  await assert.rejects(check({ '/app': [entry('.env.secret', true)] }), /dotenv/);
  await assert.rejects(check({ '/app': [entry('.env')] }), /dotenv/);
});
