'use strict';
const fs = require('node:fs/promises');
const http = require('node:http');
const crypto = require('node:crypto');
const { makeStore, hash } = require('./store.cjs');
const { makeClients } = require('./clients.cjs');
const handlers = require('./handlers.cjs');
const { pollPipeline, pollKpi } = require('./pollers.cjs');
const { creators } = require('./creators.cjs');
function equal(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function validateConfig(c) {
  for (const key of ['crmToken', 'discordToken']) {
    if (typeof c[key] !== 'string' || c[key].length < 20) throw Error('missing_config');
  }
  for (const key of ['botId', 'guildId', 'pipelineChannelId', 'kpiChannelId']) {
    if (!/^\d{17,20}$/.test(c[key])) throw Error('invalid_config_id');
  }
  if (c.guildId !== '1522153792592806018'
    || c.pipelineChannelId !== '1533123521574862991'
    || c.kpiChannelId !== '1533123515023360114') throw Error('destination_changed');
  if (!Array.isArray(c.allowedActorIds) || !c.allowedActorIds.length
    || c.allowedActorIds.some(id => !/^\d{17,20}$/.test(id))) throw Error('actor_gate_missing');
  if (new Date(c.reactivationAfter).toISOString() !== c.reactivationAfter) throw Error('invalid_cutoff');
  return c;
}
async function createService(config, directory, request) {
  validateConfig(config);
  const store = makeStore(directory); await store.ready();
  const policyHash = hash(JSON.stringify({
    reactivationAfter: config.reactivationAfter, guildId: config.guildId,
    pipeline: config.pipelineChannelId, kpi: config.kpiChannelId,
    allowedActorIds: [...config.allowedActorIds].sort()
  }));
  const stored = await store.get('installation-policy');
  if (!stored || stored.hash !== policyHash) throw Error('persistent_policy_missing_or_changed');
  const ctx = { config, store, lock: store.lock, ...makeClients(config, store, request) };
  const routes = { notify: handlers.notify, digest: handlers.digest, intake: handlers.intake,
    progress: handlers.progress, pipeline: pollPipeline, kpi: pollKpi, creators };
  let stopping = false;
  const server = http.createServer(async (req, res) => {
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (!equal(req.headers.authorization || '', 'Bearer ' + config.crmToken)) {
      reply(401, { ok: false, error: 'unauthorized' }); return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      try {
        await store.ready();
        const names = await fs.readdir(directory);
        const locks = names.filter(n => n.endsWith('.lock')).length;
        reply(200, { ok: true, accepting: !stopping, persistentPolicy: !!(await store.get('installation-policy')),
          activeLocks: locks, scopes: Object.keys(routes), now: ctx.now() });
      } catch { reply(503, { ok: false, error: 'ledger_unavailable' }); }
      return;
    }
    const name = req.url?.match(/^\/run\/([a-z]+)$/)?.[1];
    if (stopping || req.method !== 'POST' || !Object.hasOwn(routes, name)) { reply(404, { ok: false, error: 'route_not_allowed' }); return; }
    let raw = '';
    try {
      for await (const chunk of req) {
        raw += chunk.toString('utf8');
        if (Buffer.byteLength(raw) > 65536) throw Error('body_too_large');
      }
      const body = JSON.parse(raw || '{}');
      if (!body || Array.isArray(body) || typeof body !== 'object') throw Error('invalid_body');
      const start = ctx.now();
      const result = await routes[name](ctx, body);
      await store.put('last-run:' + name, { startedAt: start, finishedAt: ctx.now(), result });
      reply(result.ok === false ? 502 : 200, result);
    } catch (error) {
      const code = handlers.safeCode(error);
      await store.put('last-error:' + name, { code, at: ctx.now() }).catch(() => {});
      reply(code === 'test_transient_before_delivery' ? 503 : 502, { ok: false, error: code });
    }
  });
  server.requestTimeout = 180000;
  server.headersTimeout = 15000;
  return { server, ctx, stop: () => { stopping = true; server.close(); } };
}
if (require.main === module) {
  (async () => {
    const config = JSON.parse(await fs.readFile(process.env.GUARD_CONFIG || '/config/config.json', 'utf8'));
    const service = await createService(config, process.env.GUARD_DATA || '/data');
    service.server.listen(8787, '0.0.0.0', () => console.log('guard_ready'));
    process.on('SIGTERM', service.stop); process.on('SIGINT', service.stop);
  })().catch(() => { console.error('guard_start_failed'); process.exitCode = 1; });
}
module.exports = { createService, validateConfig };
