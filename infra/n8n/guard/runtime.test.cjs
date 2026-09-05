'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { makeStore } = require('./store.cjs');
const { makeClients } = require('./clients.cjs');
const handlers = require('./handlers.cjs');
const config = {
  crmToken: 'synthetic-crm-token-not-production', discordToken: 'synthetic-discord-token',
  botId: '1522251019856121997', guildId: '1522153792592806018',
  pipelineChannelId: '1533123521574862991', kpiChannelId: '1533123515023360114',
  reactivationAfter: '2026-09-05T10:00:00.000Z', allowedActorIds: ['266632546115256321'],
  testEventId: 'SOCIALPRO_N8N_E2E_TEST_20260905T130000Z', testFailOnce: true
};
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'socialpro-guard-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = makeStore(dir); await store.ready();
  return { store, dir };
}
test('durable state survives reopen; filesystem excludes separate store instances', async t => {
  const { store, dir } = await fixture(t), second = makeStore(dir);
  await store.put('entry', { receipt: 7 });
  assert.deepEqual(await second.get('entry'), { receipt: 7 });
  await store.lock('same', () => assert.rejects(second.lock('same', () => {}), /durable_lock_busy/));
  assert.equal(await second.lock('same', () => 4), 4);
});
test('concurrent same delivery and reopened replay send only one message', async t => {
  const { store, dir } = await fixture(t); let calls = 0;
  const request = async (_url, options) => {
    calls++; const body = JSON.parse(options.body);
    assert.deepEqual(body.allowed_mentions, { parse: [] });
    assert.equal(body.enforce_nonce, true);
    assert.ok(body.nonce.length <= 25);
    return Response.json({ id: '1543182046485917744', channel_id: config.kpiChannelId, timestamp: '2026-09-05T13:00:00.000Z' });
  };
  const client = makeClients(config, store, request);
  const outcomes = await Promise.all([1, 2, 3].map(() => client.sendOnce('same', config.kpiChannelId, 'test')));
  assert.equal(calls, 1); assert.equal(outcomes.filter(x => !x.duplicate).length, 1);
  const reopened = makeClients(config, makeStore(dir), request);
  assert.equal((await reopened.sendOnce('same', config.kpiChannelId, 'test')).duplicate, true);
  assert.equal(calls, 1);
  await assert.rejects(reopened.sendOnce('same', config.kpiChannelId, 'changed'), /payload_conflict/);
});
test('uncertain send is not blindly repeated after timeout', async t => {
  const { store } = await fixture(t); let posts = 0;
  const client = makeClients(config, store, async (_url, opts) => {
    if (opts.method === 'POST') { posts++; throw Error('synthetic_timeout'); }
    return Response.json([]);
  });
  await assert.rejects(client.sendOnce('uncertain', config.kpiChannelId, 'test'), /uncertain/);
  await assert.rejects(client.sendOnce('uncertain', config.kpiChannelId, 'test'), /uncertain/);
  assert.equal(posts, 1);
});
test('uncertain response is recovered only by recorded bot nonce', async t => {
  const { store } = await fixture(t); let saved, calls = 0;
  const client = makeClients(config, store, async (_url, opts) => {
    if (opts.method === 'POST') { calls++; saved = JSON.parse(opts.body); throw Error('timeout'); }
    return Response.json([{ id: '1543182046485917744', channel_id: config.kpiChannelId,
      nonce: saved.nonce, content: 'test', author: { id: config.botId }, timestamp: '2026-09-05T13:00:00.000Z' }]);
  });
  await assert.rejects(client.sendOnce('recover', config.kpiChannelId, 'test'), /uncertain/);
  assert.equal((await client.sendOnce('recover', config.kpiChannelId, 'test')).duplicate, true);
  assert.equal(calls, 1);
});
test('financial, email, contract, arbitrary destination routes never reach network', async t => {
  const { store } = await fixture(t); let calls = 0;
  const c = makeClients(config, store, () => { calls++; throw Error('unexpected'); });
  for (const route of ['/api/automation/deals/invoices', '/api/automation/deals/reminders',
    '/api/automation/deals', '/api/admin/banks/sync', '//other.example/private']) {
    await assert.rejects(c.crm(route, { method: 'POST' }), /not_allowed/);
  }
  await assert.rejects(c.sendOnce('no', '123456789012345678', 'test'), /not_allowed/);
  assert.equal(calls, 0);
});
test('E2E fail-before-send, retry, replay: one CRM draft and one message', async t => {
  const { store } = await fixture(t); let creates = 0, sends = 0;
  const ctx = { config, store, lock: store.lock, now: () => '2026-09-05T13:00:01.000Z',
    crm: async (route, opts) => {
      if (opts?.method === 'POST') { creates++; assert.equal(route, '/api/automation/deal-drafts');
        assert.equal(opts.body.source, 'api');
        return { ok: true, draft: { id: 123, status: 'missing_info', campaignId: null, created: true } }; }
      return { ok: true, draft: { externalId: config.testEventId, campaignId: null } };
    },
    sendOnce: async () => { sends++; return { id: '1543182046485917744', channelId: config.kpiChannelId, duplicate: false }; }
  };
  const body = { testEventId: config.testEventId };
  await assert.rejects(handlers.e2e(ctx, body), /test_transient_before_delivery/);
  assert.equal(creates, 1); assert.equal(sends, 0);
  const result = await handlers.e2e(ctx, body);
  assert.equal(result.ok, true); assert.ok(result.transientFaultAt);
  const replay = await handlers.e2e(ctx, body);
  assert.equal(replay.duplicate, true); assert.equal(creates, 1); assert.equal(sends, 1);
});
test('old intake rejected BEFORE CRM; synthetic test requires exact authorized ID', async t => {
  const { store } = await fixture(t); let calls = 0;
  const ctx = { config, store, lock: store.lock, now: () => '2026-09-05T13:00:01.000Z',
    crm: () => { calls++; }, sendOnce: () => { calls++; } };
  await assert.rejects(handlers.intake(ctx, { source: 'discord', externalId: '1533123521574862991',
    sourceChannelId: config.pipelineChannelId, rawText: 'old' }), /historical_blocked/);
  await assert.rejects(handlers.e2e(ctx, { testEventId: 'SOCIALPRO_N8N_E2E_TEST_20260905T000000Z' }), /not_authorized/);
  assert.equal(calls, 0);
});
test('progress partial sync is explicitly failed; no invoices/reminders or alert replay', async t => {
  const { store } = await fixture(t); const routes = [];
  await store.put('progress-future:v1', require('./progress.cjs').initialState(config));
  const now = '2026-09-05T13:00:01.000Z'; let sends = 0;
  const deals = [1, 2, 3].map(campaignId => ({ campaignId, progressPct: 100,
    currentCount: 100, targetCount: 100, lastSyncedAt: now,
    syncError: campaignId === 3 ? 'synthetic_unavailable' : null,
    trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/synthetic-' + campaignId }));
  const ctx = { config, store, lock: store.lock, now: () => now,
    crm: async (route, options = {}) => {
      routes.push({ route, method: options.method || 'GET' });
      if (route === '/api/automation/deals/sync') {
        assert.deepEqual(options, { method: 'POST', body: {} });
        return { ok: true, total: 3, synced: 2, failed: 1, alerts: [{ campaignId: 1 }] };
      }
      assert.equal(route, '/api/automation/deals/digest', 'no ACK, invoice, reminder or other CRM request');
      assert.deepEqual(options, {});
      return { ok: true, generatedAt: now, summary: { total: deals.length }, deals };
    },
    sendOnce: async () => { sends++; throw Error('unexpected_historical_delivery'); } };
  const result = await handlers.progress(ctx);
  assert.equal(result.ok, false); assert.equal(result.failed, 1);
  assert.equal(result.synced, 2); assert.equal(result.baselineEstablished, 2);
  assert.equal(result.historicalAlertsIgnored, 1); assert.equal(result.alertsDelivered, 0);
  assert.equal(result.acknowledgements, 0); assert.equal(result.sensitiveBranchesRemoved, true);
  assert.deepEqual(Object.keys((await store.get('progress-future:v1')).baselines).sort(), ['1', '2']);
  const replay = await handlers.progress(ctx);
  assert.equal(replay.ok, false); assert.equal(replay.duplicate, true); assert.equal(sends, 0);
  assert.deepEqual(routes, [
    { route: '/api/automation/deals/sync', method: 'POST' },
    { route: '/api/automation/deals/digest', method: 'GET' },
  ]);
});
