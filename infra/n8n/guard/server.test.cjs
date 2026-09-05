'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { makeStore } = require('./store.cjs');
const { initialize } = require('./initialize.cjs');
const { createService } = require('./server.cjs');

// Destinations are fixed public identifiers required by the service contract.
// Tokens, actor and payloads are synthetic. Only an ephemeral loopback listener
// is used; injected provider requests must stay at zero in these negative tests.
const config = {
  crmToken: 'synthetic-http-crm-token-not-production', discordToken: 'synthetic-http-discord-token',
  botId: '111111111111111111', guildId: '1522153792592806018',
  pipelineChannelId: '1533123521574862991', kpiChannelId: '1533123515023360114',
  allowedActorIds: ['222222222222222222'], reactivationAfter: '2026-09-05T10:00:00.000Z',
};
async function fixture(t) {
  const tempRoot = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(tempRoot, 'socialpro-guard-http-'));
  const resolved = await fs.realpath(directory);
  assert.equal(path.dirname(resolved), tempRoot);
  assert.ok(path.basename(resolved).startsWith('socialpro-guard-http-'));
  t.after(async () => {
    // Exact captured disposable directory, never a computed broad removal.
    assert.equal(path.dirname(resolved), tempRoot);
    await fs.rm(resolved, { recursive: true, force: true });
  });
  return { directory, store: makeStore(directory) };
}
function call(server, target, { method = 'POST', token = config.crmToken, body = '{}' } = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    assert.equal(address.address, '127.0.0.1');
    const request = http.request({ hostname: '127.0.0.1', port: address.port, path: target,
      method, agent: false, headers: { ...(token === null ? {} : { Authorization: 'Bearer ' + token }),
        'Content-Type': 'application/json', Connection: 'close' } }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        try { resolve({ status: response.statusCode, body: JSON.parse(raw) }); }
        catch (error) { reject(error); }
      });
    });
    request.setTimeout(3000, () => request.destroy(Error('local_test_timeout')));
    request.on('error', reject); request.end(method === 'GET' ? undefined : body);
  });
}
async function running(t, check) {
  const f = await fixture(t); await initialize(config, f.directory);
  let externalCalls = 0;
  const service = await createService(config, f.directory, async () => {
    externalCalls++; throw Error('external_network_forbidden_in_test');
  });
  service.server.listen(0, '127.0.0.1'); await once(service.server, 'listening');
  try { await check({ ...f, service, externalCalls: () => externalCalls }); }
  finally { await new Promise((resolve, reject) => service.server.close((error) => error ? reject(error) : resolve())); }
}

for (const [name, token] of [['absent', null], ['wrong', 'wrong-synthetic-token']]) {
  test('HTTP missing/incorrect authentication is 401: ' + name, (t) => running(t, async f => {
    for (const target of ['/health', '/run/kpi', '/run/notify', '/run/creators']) {
      const response = await call(f.service.server, target, { token, method: target === '/health' ? 'GET' : 'POST' });
      assert.deepEqual(response, { status: 401, body: { ok: false, error: 'unauthorized' } });
    }
    assert.equal(f.externalCalls(), 0);
    assert.equal(await f.store.get('last-run:kpi'), null);
  }));
}
test('HTTP route allowlist rejects financial, unknown and inherited names with 404', t => running(t, async f => {
  for (const target of ['/run/invoices', '/run/payments', '/run/banks', '/run/email',
    '/run/e2e', '/run/unknown', '/run/constructor', '/run/__proto__', '/run/kpi?invoice=true']) {
    const response = await call(f.service.server, target);
    assert.deepEqual(response, { status: 404, body: { ok: false, error: 'route_not_allowed' } });
    assert.ok(!JSON.stringify(response).includes(config.crmToken));
  }
  assert.equal((await call(f.service.server, '/run/kpi', { method: 'GET' })).status, 404);
  assert.equal(f.externalCalls(), 0);
}));
test('authenticated HTTP health exposes no token and makes no provider request', t => running(t, async f => {
  const response = await call(f.service.server, '/health', { method: 'GET' });
  assert.equal(response.status, 200); assert.equal(response.body.persistentPolicy, true);
  assert.ok(!JSON.stringify(response).includes(config.crmToken));
  assert.ok(!JSON.stringify(response).includes(config.discordToken));
  assert.deepEqual(response.body.scopes.sort(), ['creators', 'digest', 'intake', 'kpi', 'notify', 'pipeline', 'progress']);
  assert.equal(f.externalCalls(), 0);
}));
test('authenticated creators route uses the CRM outbox contract and rejects caller-supplied content', t => running(t, async f => {
  let reads = 0;
  f.service.ctx.crm = async route => {
    assert.equal(route, '/api/automation/discord/creator-discovery?since=' + encodeURIComponent(config.reactivationAfter));
    reads++; return { ok: true, notifications: [] };
  };
  const response = await call(f.service.server, '/run/creators');
  assert.equal(response.status, 200); assert.equal(response.body.delivered, 0); assert.equal(reads, 1);
  assert.equal((await f.store.get('last-run:creators')).result.ok, true);
  assert.equal((await call(f.service.server, '/run/creators', { body: '{"message":"forbidden"}' })).status, 502);
  assert.equal(reads, 1); assert.equal(f.externalCalls(), 0);
}));
test('startup refuses a missing policy without initializing state or network', async t => {
  const f = await fixture(t); let externalCalls = 0;
  await assert.rejects(createService(config, f.directory, () => { externalCalls++; }), /persistent_policy_missing_or_changed/);
  assert.deepEqual(await fs.readdir(f.directory), []); assert.equal(externalCalls, 0);
});
test('startup refuses changed frozen policy, preserving the existing checkpoints', async t => {
  const f = await fixture(t); await initialize(config, f.directory);
  const previous = await f.store.get('poll-kpi-checkpoint');
  await assert.rejects(createService({ ...config, reactivationAfter: '2026-09-05T11:00:00.000Z' }, f.directory,
    () => { throw Error('network_forbidden'); }), /persistent_policy_missing_or_changed/);
  assert.deepEqual(await f.store.get('poll-kpi-checkpoint'), previous);
});
test('explicit initializer succeeds only once on an empty directory and never resets a cursor', async t => {
  const f = await fixture(t); await initialize(config, f.directory);
  const prior = await f.store.get('poll-kpi-checkpoint');
  assert.equal(prior.cursor, null); assert.equal(prior.policy.reactivationAfter, config.reactivationAfter);
  assert.equal(await f.store.get('poll-kpi-pending'), null);
  const advanced = { ...prior, cursor: '1543194280550400000', revision: 1 };
  await f.store.put('poll-kpi-checkpoint', advanced);
  await assert.rejects(initialize(config, f.directory), /initialization_requires_empty_directory/);
  assert.deepEqual(await f.store.get('poll-kpi-checkpoint'), advanced);
});
test('initializer refuses a preexisting unrelated file without writing policy', async t => {
  const f = await fixture(t); await f.store.put('unrelated-fixture', { preserved: true });
  await assert.rejects(initialize(config, f.directory), /initialization_requires_empty_directory/);
  assert.equal(await f.store.get('installation-policy'), null);
  assert.deepEqual(await f.store.get('unrelated-fixture'), { preserved: true });
});
for (const mode of ['pipeline', 'kpi']) {
  test('HTTP lost ' + mode + ' checkpoint fails closed with zero provider requests', t => running(t, async f => {
    await f.store.put('poll-' + mode + '-checkpoint', null);
    const response = await call(f.service.server, '/run/' + mode);
    assert.deepEqual(response, { status: 502, body: { ok: false, error: 'poller:checkpoint_missing' } });
    assert.equal(f.externalCalls(), 0);
    assert.equal(await f.store.get('poll-' + mode + '-checkpoint'), null);
  }));
}
test('HTTP malformed JSON or non-object input cannot reach a provider', t => running(t, async f => {
  for (const body of ['[1]', 'null', '"text"', '{']) {
    assert.equal((await call(f.service.server, '/run/kpi', { body })).status, 502);
  }
  assert.equal(f.externalCalls(), 0);
}));
