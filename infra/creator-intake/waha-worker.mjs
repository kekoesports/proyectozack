import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { POST } from '../../src/app/api/webhooks/creator-intake/waha/route.ts';
import { closeDbPool } from '../../src/lib/db.ts';
import { db } from '../../src/lib/db.ts';
import { env } from '../../src/lib/env.ts';
import { processWahaInbox } from '../../src/lib/intake/inbox.ts';
import { processWahaUpdate } from '../../src/lib/intake/waha-process.ts';
import { intakeHealth } from '../../src/lib/intake/health.ts';
import { access, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

let stopping = false;
let lastTick = 0;
let health = null;
let lastHealth = 0;
let paused = false;
async function isPaused() {
  if (!env.CREATOR_INTAKE_AI_PILOT_DIR) return true;
  try { await access(join(env.CREATOR_INTAKE_AI_PILOT_DIR, 'whatsapp-processing-paused')); return true; }
  catch (error) { return error?.code !== 'ENOENT'; }
}
async function consume() {
  while (!stopping) {
    try {
      paused = await isPaused();
      if (!paused) await processWahaInbox(db, processWahaUpdate);
      lastTick = Date.now();
      if (Date.now() - lastHealth > 60_000) {
        health = await intakeHealth(db);
        lastHealth = Date.now();
        if (env.CREATOR_INTAKE_AI_PILOT_DIR) {
          const file = join(env.CREATOR_INTAKE_AI_PILOT_DIR, 'whatsapp-health.json');
          await writeFile(file + '.tmp', JSON.stringify(health), { mode: 0o600 });
          await rename(file + '.tmp', file);
        }
      }
    } catch { console.warn('[creator-intake] worker-cycle-failed'); }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Private worker: exposes only this authenticated webhook, never the CRM itself.
const server = createServer(async (incoming, outgoing) => {
  if (incoming.method === 'GET' && incoming.url === '/health') {
    const ok = Date.now() - lastTick < 120_000;
    outgoing.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' });
    outgoing.end(JSON.stringify({ ok, lastTick, paused, ...health }));
    return;
  }
  if (incoming.method !== 'POST' || incoming.url !== '/api/webhooks/creator-intake/waha') {
    outgoing.writeHead(404); outgoing.end(); return;
  }
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) {
      if (typeof value === 'string') headers.set(key, value);
    }
    const response = await POST(new Request('http://intake-worker/api/webhooks/creator-intake/waha', {
      method: 'POST', headers, body: Readable.toWeb(incoming), duplex: 'half',
    }));
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(await response.text());
  } catch {
    outgoing.writeHead(500); outgoing.end('{"ok":false}');
  }
});
server.requestTimeout = 60_000;
server.headersTimeout = 10_000;
server.listen(3000, '0.0.0.0', () => console.log('Private WhatsApp intake worker ready'));
void consume();
process.on('SIGTERM', () => { stopping = true; server.close(async () => { await closeDbPool(); process.exit(0); }); });
