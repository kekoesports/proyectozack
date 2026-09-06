'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { hash } = require('./store.cjs');
const { makeClients } = require('./clients.cjs');
const { creators } = require('./creators.cjs');
const { partners, initialPartnerRollout, ROLLOUT_KEY } = require('./partners.cjs');
const { intake, e2e } = require('./handlers.cjs');
const { ROUTING_KEY, CREATOR_CHANNEL, PARTNER_CHANNEL, initialRoutingPolicy,
  loadRoutingPolicy, validateRoutingConfig, destination } = require('./routing.cjs');
const { validateConfig, createService } = require('./server.cjs');
const { initialize } = require('./initialize.cjs');
const { makeStore } = require('./store.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const T0 = '2026-09-05T10:00:00.000Z', ACTIVE = '2026-09-05T14:00:00.000Z';
const NOW = '2026-09-05T14:03:00.000Z', OLD = '2026-09-05T13:02:00.000Z';
const NEW = '2026-09-05T14:01:00.000Z', RECEIPT = '2026-09-05T14:02:00.000Z';
const legacy = { crmToken: 'synthetic-routing-crm-token', discordToken: 'synthetic-routing-discord-token',
  botId: '111111111111111111', guildId: '1522153792592806018',
  kpiChannelId: '1533123515023360114', pipelineChannelId: '1533123521574862991',
  reactivationAfter: T0, allowedActorIds: ['222222222222222222'] };
const config = { ...legacy, creatorChannelId: CREATOR_CHANNEL, partnerChannelId: PARTNER_CHANNEL };
const receipt = channelId => ({ id: '555555555555555555', channelId, timestamp: RECEIPT, duplicate: false });
const creatorItem = (id = 3, channelId = CREATOR_CHANNEL) => ({ id, eventKey: 'creator-test:synthetic_' + id,
  createdAt: id > 2 ? NEW : OLD, guildId: config.guildId, channelId, message: '[TEST] Synthetic creator only.' });
const partnerItem = (batchId = 3, channelId = PARTNER_CHANNEL) => ({ batchId, guildId: config.guildId,
  channelId, message: '[TEST] Synthetic partner only.' });
const idAt = stamp => ((BigInt(Date.parse(stamp)) - 1420070400000n) << 22n).toString();
const intakeBody = (stamp = NEW) => ({ externalId: idAt(stamp), source: 'discord',
  sourceChannelId: config.pipelineChannelId, rawText: '[TEST] No real deal.' });
function fingerprint(item) { return hash(JSON.stringify(item)); }
function fixture(options = {}) {
  const current = structuredClone(options.config || config);
  const prior = initialPartnerRollout(legacy, '2026-09-05T13:00:00.000Z', 0);
  const data = new Map([[ROLLOUT_KEY, prior]]), calls = [], writes = [];
  if (options.policy !== false) data.set(ROUTING_KEY, initialRoutingPolicy(current, {
    activatedAt: ACTIVE, creatorMaxOutboxId: 2, partnerMaxBatchId: 2, priorPartnerRolloutHash: prior.hash }));
  const store = { get: async key => structuredClone(data.get(key) ?? null),
    put: async (key, value) => { writes.push(key); data.set(key, structuredClone(value)); },
    lock: async (_key, fn) => fn() };
  const items = { creators: options.creators || [], partners: options.partners || [] };
  const request = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, method: init.method, body });
    assert.equal(init.redirect, 'error');
    if (url.startsWith('https://discord.com/api/v10/channels/')) {
      assert.equal(init.method, 'POST'); assert.deepEqual(body.allowed_mentions, { parse: [] });
      assert.equal(body.enforce_nonce, true);
      const channelId = url.split('/')[6];
      return Response.json({ id: '555555555555555555', channel_id: options.wrongReceipt || channelId, timestamp: RECEIPT });
    }
    if (url.includes('/creator-discovery?since=')) return Response.json({ ok: true, notifications: items.creators });
    if (url.endsWith('/partner-leads')) return Response.json({ ok: true, configured: true, notifications: items.partners });
    if (/creator-discovery\/\d+\/ack$/.test(url)) {
      assert.equal(body.channelId, destination(current, 'creator'));
      return Response.json({ ok: true, result: 'acknowledged' });
    }
    if (/partner-leads\/\d+\/ack$/.test(url)) return Response.json({ ok: true, acknowledged: true });
    if (url.endsWith('/deal-drafts')) return Response.json({ ok: true, draft: { id: 77,
      status: 'missing_info', createdAt: options.draftCreatedAt || NEW, proposedDeal: {}, missingFields: [] } });
    throw Error('unexpected_fixture_http');
  };
  const ctx = { config: current, store, lock: store.lock, ...makeClients(current, store, request), now: () => NOW };
  return { ctx, data, store, calls, writes, items,
    effects: () => calls.filter(call => call.method !== 'GET'),
    sends: () => calls.filter(call => call.url.startsWith('https://discord.com/')) };
}
test('routing policy is additive and legacy destinations remain unchanged when omitted', async () => {
  const f = fixture({ config: legacy, policy: false });
  assert.equal(await loadRoutingPolicy(f.ctx), null);
  assert.equal(destination(legacy, 'creator'), legacy.kpiChannelId);
  assert.equal(destination(legacy, 'partner'), legacy.kpiChannelId);
  assert.equal(validateConfig(legacy), legacy);
  assert.equal(f.writes.length + f.calls.length, 0);
});
for (const key of ['creatorChannelId', 'partnerChannelId']) {
  for (const value of ['999999999999999999', legacy.kpiChannelId, '', null, undefined]) {
    test('optional destination rejects unreviewed override ' + key + ':' + String(value), () => {
      assert.throws(() => validateRoutingConfig({ ...legacy, [key]: value }), /routing_destination_changed/);
    });
  }
}
test('one optional channel leaves the other on legacy KPI but freezes both effective destinations', async () => {
  const f = fixture({ config: { ...legacy, creatorChannelId: CREATOR_CHANNEL } });
  const row = await loadRoutingPolicy(f.ctx);
  assert.equal(row.creatorChannelId, CREATOR_CHANNEL); assert.equal(row.partnerChannelId, legacy.kpiChannelId);
  f.ctx.config.partnerChannelId = PARTNER_CHANNEL;
  await assert.rejects(loadRoutingPolicy(f.ctx), /routing_policy_missing_or_changed/);
});
for (const patch of [{ hash: '0'.repeat(64) }, { creatorMaxOutboxId: 0 }, { partnerMaxBatchId: 0 },
  { intakeChannelId: legacy.kpiChannelId }, { reactivationAfter: ACTIVE }, { extra: true },
  { activatedAt: '2099-01-01T00:00:00.000Z' }, { priorPartnerRolloutHash: '0'.repeat(64) }]) {
  test('policy tampering blocks both families before HTTP or mutation: ' + Object.keys(patch)[0], async () => {
    const f = fixture(); Object.assign(f.data.get(ROUTING_KEY), patch);
    await assert.rejects(creators(f.ctx), /routing_/); await assert.rejects(partners(f.ctx), /routing_/);
    assert.equal(f.calls.length + f.writes.length, 0);
  });
}
test('missing policy blocks lead sends, both ACK clients and intake before any mutation', async () => {
  const f = fixture({ policy: false });
  await assert.rejects(creators(f.ctx), /routing_policy/);
  await assert.rejects(partners(f.ctx), /routing_policy/);
  await assert.rejects(intake(f.ctx, intakeBody()), /routing_policy/);
  await assert.rejects(f.ctx.sendOnce('test', CREATOR_CHANNEL, '[TEST]'), /routing_policy/);
  await assert.rejects(f.ctx.sendOnce('test', PARTNER_CHANNEL, '[TEST]'), /routing_policy/);
  await assert.rejects(f.ctx.crm('/api/automation/discord/creator-discovery/3/ack', {
    method: 'POST', body: { messageId: '555555555555555555', channelId: CREATOR_CHANNEL } }), /routing_policy/);
  await assert.rejects(f.ctx.crm('/api/automation/discord/partner-leads/3/ack', { method: 'POST', body: {} }), /routing_policy/);
  assert.equal(f.calls.length + f.writes.length, 0);
});
test('removing routing config cannot silently route newly queued work back into KPI', async () => {
  const f = fixture(); f.ctx.config = legacy;
  await assert.rejects(loadRoutingPolicy(f.ctx), /routing_policy_missing_or_changed/);
  assert.equal(f.calls.length + f.writes.length, 0);
});
for (const patch of [{ channelId: PARTNER_CHANNEL }, { maxHistoricalBatchId: 3 }, { hash: 'a'.repeat(64) }]) {
  test('historical Partners rollout cannot be reset or rebound: ' + Object.keys(patch)[0], async () => {
    const f = fixture(); Object.assign(f.data.get(ROLLOUT_KEY), patch);
    await assert.rejects(loadRoutingPolicy(f.ctx), /routing_prior_rollout_changed/);
    assert.equal(f.calls.length + f.writes.length, 0);
  });
}
for (const [name, run, itemKey, item] of [
  ['creators', creators, 'creators', creatorItem()], ['partners', partners, 'partners', partnerItem()],
]) {
  test(name + ' uses the new destination and preserves exact receipt across replay', async () => {
    const f = fixture({ [itemKey]: [item] }), prior = JSON.stringify(f.data.get(ROLLOUT_KEY));
    const result = await run(f.ctx); assert.equal(result.ok, true); assert.equal(result.delivered, 1);
    assert.equal(f.sends().length, 1); assert.match(f.sends()[0].url, new RegExp('/' + item.channelId + '/messages$'));
    const saved = JSON.stringify([...f.data].filter(([key]) => /^(?:delivery:|creator-notification:|partner-notification:)/.test(key)));
    assert.equal((await run(f.ctx)).duplicates, 1); assert.equal(f.sends().length, 1);
    assert.equal(f.effects().length, 2); // exactly one send and one ACK
    assert.equal(JSON.stringify(f.data.get(ROLLOUT_KEY)), prior);
    assert.equal(JSON.stringify([...f.data].filter(([key]) => /^(?:delivery:|creator-notification:|partner-notification:)/.test(key))), saved);
  });
  for (const channelId of [legacy.kpiChannelId, legacy.pipelineChannelId, name === 'creators' ? PARTNER_CHANNEL : CREATOR_CHANNEL]) {
    test(name + ' rejects wrong new-item destination before any effect: ' + channelId, async () => {
      const f = fixture({ [itemKey]: [{ ...item, channelId }] });
      await assert.rejects(run(f.ctx), /destination_blocked/);
      assert.equal(f.effects().length + f.writes.length, 0);
    });
  }
  test(name + ' rejects old KPI receipt on a new-channel delivery and never ACKs', async () => {
    const f = fixture({ [itemKey]: [item], wrongReceipt: legacy.kpiChannelId });
    const result = await run(f.ctx); assert.equal(result.ok, false);
    assert.equal(f.sends().length, 1); assert.equal(f.effects().length, 1);
  });
}
test('creator ACK accepts only active creator destination, not KPI or partner destination', async () => {
  const f = fixture();
  for (const channelId of [legacy.kpiChannelId, PARTNER_CHANNEL, legacy.pipelineChannelId]) {
    await assert.rejects(f.ctx.crm('/api/automation/discord/creator-discovery/3/ack', {
      method: 'POST', body: { messageId: '555555555555555555', channelId } }), /invalid_creator_ack/);
  }
  assert.equal(f.calls.length + f.writes.length, 0);
});
test('creator historical acknowledged plan retains old destination and never sends or ACKs', async () => {
  const item = creatorItem(2, legacy.kpiChannelId), f = fixture({ creators: [item] });
  const key = 'creator-notification:' + item.eventKey;
  f.data.set(key, { state: 'acknowledged', id: item.id, fingerprint: fingerprint(item), receipt: receipt(legacy.kpiChannelId),
    preparedAt: OLD, acknowledgedAt: OLD });
  const before = JSON.stringify(f.data.get(key));
  assert.equal((await creators(f.ctx)).duplicates, 1);
  assert.equal(f.effects().length, 0); assert.equal(JSON.stringify(f.data.get(key)), before);
});
test('partner old acknowledged plan replays even when CRM projects current channel from env', async () => {
  const old = partnerItem(2, legacy.kpiChannelId), f = fixture({ partners: [partnerItem(2)] });
  const key = 'partner-notification:2';
  f.data.set(key, { state: 'acknowledged', batchId: 2, fingerprint: fingerprint(old),
    rolloutHash: f.data.get(ROLLOUT_KEY).hash, preparedAt: OLD, receipt: receipt(legacy.kpiChannelId), acknowledgedAt: OLD });
  const before = JSON.stringify(f.data.get(key));
  assert.equal((await partners(f.ctx)).duplicates, 1);
  assert.equal(f.effects().length, 0); assert.equal(JSON.stringify(f.data.get(key)), before);
  f.items.partners[0].message = '[TEST] changed historical payload';
  await assert.rejects(partners(f.ctx), /plan_conflict/); assert.equal(f.effects().length, 0);
});
for (const family of ['creators', 'partners']) {
  for (const state of [null, 'prepared', 'delivered']) {
    test(family + ' pre-cutover unresolved item blocks the whole page before effects: ' + state, async () => {
      const isCreator = family === 'creators', old = isCreator ? creatorItem(2, legacy.kpiChannelId) : partnerItem(2);
      const fresh = isCreator ? creatorItem() : partnerItem();
      const f = fixture({ [family]: [fresh, old] });
      if (state) f.data.set(isCreator ? 'creator-notification:' + old.eventKey : 'partner-notification:2', { state });
      await assert.rejects((isCreator ? creators : partners)(f.ctx), /pre_cutover_requires_review/);
      assert.equal(f.effects().length + f.writes.length, 0);
    });
  }
}
test('a new creator ID with an old creation date cannot migrate historical content', async () => {
  const f = fixture({ creators: [{ ...creatorItem(), createdAt: OLD }] });
  await assert.rejects(creators(f.ctx), /pre_cutover_requires_review/);
  assert.equal(f.effects().length + f.writes.length, 0);
});
test('new intake goes to pipeline while existing completed result and old plan remain byte-identical', async () => {
  const f = fixture(), body = intakeBody();
  assert.equal((await intake(f.ctx, body)).ok, true);
  assert.equal(f.sends().length, 1); assert.match(f.sends()[0].url, new RegExp('/' + legacy.pipelineChannelId + '/messages$'));
  assert.equal((await intake(f.ctx, body)).duplicate, true); assert.equal(f.effects().length, 2);
  const oldBody = intakeBody(OLD), key = 'intake:discord:' + oldBody.externalId;
  const entry = { fingerprint: fingerprint(oldBody), receivedAt: OLD, result: { ok: true, draftId: 1 } };
  const plan = { channelId: legacy.kpiChannelId, parts: ['[TEST] previous'], createdAt: OLD };
  f.data.set(key, entry); f.data.set('plan:' + key, plan);
  const before = JSON.stringify([f.data.get(key), f.data.get('plan:' + key)]);
  assert.equal((await intake(f.ctx, oldBody)).duplicate, true); assert.equal(f.effects().length, 2);
  assert.equal(JSON.stringify([f.data.get(key), f.data.get('plan:' + key)]), before);
});
test('old unprocessed intake and old draft readback never produce a new Discord message', async () => {
  const f = fixture(); await assert.rejects(intake(f.ctx, intakeBody(OLD)), /pre_cutover_requires_review/);
  assert.equal(f.effects().length + f.writes.length, 0);
  const g = fixture({ draftCreatedAt: OLD });
  assert.equal((await intake(g.ctx, intakeBody())).historicalSkipped, true); assert.equal(g.sends().length, 0);
});
test('new explicit E2E goes to pipeline; replay and historical E2E result/plan remain untouched', async () => {
  const f = fixture(), id = 'SOCIALPRO_N8N_E2E_TEST_20260905T140100Z';
  f.ctx.config.testEventId = id; f.ctx.config.testFailOnce = true;
  let creates = 0;
  f.ctx.crm = async (route, options = {}) => {
    if (options.method === 'POST') {
      assert.equal(route, '/api/automation/deal-drafts'); creates++;
      assert.equal(options.body.source, 'api'); assert.equal(options.body.externalId, id);
      return { ok: true, draft: { id: 77, status: 'missing_info', campaignId: null, created: true } };
    }
    assert.equal(route, '/api/automation/deal-drafts/77');
    return { ok: true, draft: { externalId: id, campaignId: null } };
  };
  await assert.rejects(e2e(f.ctx, { testEventId: id }), /test_transient_before_delivery/);
  assert.equal(f.sends().length, 0); assert.equal(f.data.get('e2e:' + id).channelId, legacy.pipelineChannelId);
  const result = await e2e(f.ctx, { testEventId: id });
  assert.equal(result.discord.channelId, legacy.pipelineChannelId); assert.equal(creates, 1);
  assert.equal((await e2e(f.ctx, { testEventId: id })).duplicate, true); assert.equal(f.sends().length, 1);
  const oldId = 'SOCIALPRO_N8N_E2E_TEST_20260905T130200Z'; f.ctx.config.testEventId = oldId;
  const record = { id: oldId, result: { ok: true, discord: receipt(legacy.kpiChannelId) } };
  const plan = { channelId: legacy.kpiChannelId, parts: ['[TEST] old'], createdAt: OLD };
  f.data.set('e2e:' + oldId, record); f.data.set('plan:' + oldId, plan);
  assert.equal((await e2e(f.ctx, { testEventId: oldId })).duplicate, true);
  assert.deepEqual(f.data.get('e2e:' + oldId), record); assert.deepEqual(f.data.get('plan:' + oldId), plan);
  assert.equal(creates, 1); assert.equal(f.sends().length, 1);
});
test('service accepts additive routing without changing installation policy or either checkpoint', async t => {
  const parent = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(parent, 'socialpro-routing-fixture-'));
  t.after(async () => { assert.equal(path.dirname(directory), parent); await fs.rm(directory, { recursive: true, force: true }); });
  await initialize(legacy, directory); const store = makeStore(directory);
  const keys = ['installation-policy', 'poll-kpi-checkpoint', 'poll-pipeline-checkpoint', 'progress-future:v1'];
  const before = await Promise.all(keys.map(key => store.get(key)));
  let network = 0; const request = async () => { network++; throw Error('no_network'); };
  await assert.rejects(createService(config, directory, request), /routing_policy_missing_or_changed/);
  const f = fixture(); await store.put(ROLLOUT_KEY, f.data.get(ROLLOUT_KEY)); await store.put(ROUTING_KEY, f.data.get(ROUTING_KEY));
  const service = await createService(config, directory, request); service.stop();
  assert.deepEqual(await Promise.all(keys.map(key => store.get(key))), before);
  await assert.rejects(createService(legacy, directory, request), /routing_policy_missing_or_changed/);
  assert.equal(network, 0);
});
