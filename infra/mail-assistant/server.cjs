'use strict';
const fs = require('node:fs/promises');
const http = require('node:http');
const { timingSafeEqual } = require('node:crypto');
const { z } = require('zod');
const { gmail } = require('./gmail.cjs');
const { processor } = require('./processor.cjs');
const { makeStore } = require('./store.cjs');
async function main() {
  const config = z.object({ clientId: z.string(), clientSecret: z.string(), refreshToken: z.string(),
    secret: z.string().min(32), cutoff: z.number().int().positive(), enabled: z.boolean() })
    .parse(JSON.parse(await fs.readFile('/config/mail.json','utf8')));
  const store = makeStore('/data'); await store.ready();
  const app = processor({ api: gmail(config), store, cutoff: config.cutoff });
  const auth = Buffer.from('Bearer ' + config.secret);
  http.createServer(async (req,res) => {
    res.setHeader('Content-Type','application/json');
    const supplied = Buffer.from(req.headers.authorization || '');
    if (supplied.length !== auth.length || !timingSafeEqual(supplied, auth)) { res.writeHead(401);res.end('{"error":"unauthorized"}');return; }
    if (req.method !== 'POST' || req.url !== '/poll') { res.writeHead(404);res.end('{}');return; }
    if (!config.enabled) { res.writeHead(409);res.end('{"error":"paused"}');return; }
    try { res.end(JSON.stringify(await app.poll())); }
    catch { res.writeHead(503); res.end('{"error":"mail_check_failed","action":"inspect_private_service"}'); }
  }).listen(3100,'0.0.0.0');
}
main().catch(() => { console.error('mail_service_initialization_failed'); process.exitCode = 1; });
