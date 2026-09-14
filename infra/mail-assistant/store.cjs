'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');

// Exactly one guard instance owns this directory. Docker deployment enforces a
// fixed container name. No n8n Code node or second process may mount it writable.
function makeStore(directory) {
  const locks = new Map();
  async function lock(key, fn) {
    const previous = locks.get(key) || Promise.resolve();
    const running = previous.catch(() => {}).then(async () => {
      const lease = file('lock:' + key) + '.lock';
      try { await fs.mkdir(lease, { mode: 0o700 }); }
      catch (error) {
        if (error.code === 'EEXIST') throw Error('durable_lock_busy_requires_review');
        throw error;
      }
      try { return await fn(); } finally { await fs.rmdir(lease); }
    });
    locks.set(key, running);
    try { return await running; }
    finally { if (locks.get(key) === running) locks.delete(key); }
  }
  function file(key) {
    if (typeof key !== 'string' || !key || key.length > 1000) throw Error('invalid_store_key');
    return path.join(directory, hash(key) + '.json');
  }
  async function get(key) {
    try {
      const row = JSON.parse(await fs.readFile(file(key), 'utf8'));
      if (row.key !== key) throw Error('ledger_identity_mismatch');
      return row.value;
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async function put(key, value) {
    const target = file(key), temporary = target + '.' + randomUUID() + '.tmp';
    const handle = await fs.open(temporary, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify({ key, value })); await handle.sync(); }
    finally { await handle.close(); }
    await fs.rename(temporary, target);
    // The rename must survive a host restart, not just a Node process restart.
    if (process.platform !== 'win32') {
      const dir = await fs.open(directory, 'r');
      try { await dir.sync(); } finally { await dir.close(); }
    }
    const observed = await get(key);
    if (JSON.stringify(observed) !== JSON.stringify(value)) throw Error('ledger_readback_failed');
    return observed;
  }
  async function ready() {
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    await fs.access(directory, fs.constants.R_OK | fs.constants.W_OK);
  }
  return { get, put, lock, ready };
}
module.exports = { makeStore, hash };
