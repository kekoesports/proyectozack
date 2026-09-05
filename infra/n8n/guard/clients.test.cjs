'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { hash } = require('./store.cjs');
const { makeClients } = require('./clients.cjs');
const config = {
  crmToken: 'synthetic-client-token-not-production', discordToken: 'synthetic-discord-token',
  pipelineChannelId: '111111111111111111', kpiChannelId: '222222222222222222',
  botId: '333333333333333333',
};
const CHANNEL = config.kpiChannelId;
const ID = '444444444444444444';
const STAMP = '2026-09-05T13:00:00.000Z';
function fixture(respond = () => Response.json({ id: ID, channel_id: CHANNEL, timestamp: STAMP })) {
  const data = new Map(), calls = [];
  const store = {
    get: async key => data.has(key) ? structuredClone(data.get(key)) : null,
    put: async (key, value) => { data.set(key, structuredClone(value)); return value; },
    lock: async (_key, fn) => fn(),
  };
  const client = makeClients(config, store, async (url, options) => {
    calls.push({ url, options }); return respond(url, options);
  });
  return { client, data, calls };
}
function deliveryRecord(state, extra = {}) {
  return { state, fingerprint: hash(JSON.stringify({ id: CHANNEL, content: 'synthetic' })), ...extra };
}
function reactionRecord(state, extra = {}) {
  return { state, fingerprint: hash(JSON.stringify({ id: CHANNEL, messageId: ID, emoji: '✅' })), ...extra };
}
for (const [name, content] of [['empty', ''], ['whitespace', '  '], ['too long', 'a'.repeat(2001)],
  ['null', null], ['numeric', 2000], ['object', {}]]) {
  test('send refuses invalid content before any claim or HTTP: ' + name, async () => {
    const f = fixture();
    await assert.rejects(f.client.sendOnce('content', CHANNEL, content), /invalid_discord_content/);
    assert.equal(f.calls.length, 0); assert.equal(f.data.size, 0);
  });
}
test('exactly 2000 characters accepted once with mentions disabled and nonce enforced', async () => {
  const f = fixture(); const content = 'a'.repeat(2000);
  const first = await f.client.sendOnce('size-limit', CHANNEL, content);
  const replay = await f.client.sendOnce('size-limit', CHANNEL, content);
  assert.deepEqual(first, { id: ID, channelId: CHANNEL, timestamp: STAMP, duplicate: false });
  assert.equal(replay.duplicate, true); assert.equal(f.calls.length, 1);
  const body = JSON.parse(f.calls[0].options.body);
  assert.equal(body.content.length, 2000); assert.deepEqual(body.allowed_mentions, { parse: [] });
  assert.equal(body.enforce_nonce, true); assert.equal(f.calls[0].options.redirect, 'error');
});
for (const [name, row] of [['unknown state', deliveryRecord('confirmed')], ['missing state', {}],
  ['false', false], ['zero', 0], ['empty string', ''], ['array', []]]) {
  test('corrupt delivery ledger fails closed without HTTP: ' + name, async () => {
    const f = fixture(); f.data.set('delivery:corrupt', row);
    await assert.rejects(f.client.sendOnce('corrupt', CHANNEL, 'synthetic'), /invalid_delivery_ledger/);
    assert.equal(f.calls.length, 0);
  });
}
for (const [name, receipt] of [['absent', undefined], ['id missing', { channelId: CHANNEL, timestamp: STAMP }],
  ['numeric id', { id: Number(ID), channelId: CHANNEL, timestamp: STAMP }],
  ['wrong channel', { id: ID, channelId: config.pipelineChannelId, timestamp: STAMP }],
  ['timestamp missing', { id: ID, channelId: CHANNEL }],
  ['timestamp invalid', { id: ID, channelId: CHANNEL, timestamp: 'not-a-date' }],
  ['timestamp numeric', { id: ID, channelId: CHANNEL, timestamp: 0 }]]) {
  test('confirmed delivery requires a valid persisted receipt: ' + name, async () => {
    const f = fixture(); f.data.set('delivery:receipt', deliveryRecord('sent', { receipt }));
    await assert.rejects(f.client.sendOnce('receipt', CHANNEL, 'synthetic'), /invalid_delivery_receipt/);
    assert.equal(f.calls.length, 0);
  });
}
for (const [name, data] of [['missing timestamp', { id: ID, channel_id: CHANNEL }],
  ['numeric timestamp', { id: ID, channel_id: CHANNEL, timestamp: 0 }],
  ['bad timestamp', { id: ID, channel_id: CHANNEL, timestamp: 'bad' }],
  ['numeric id', { id: Number(ID), channel_id: CHANNEL, timestamp: STAMP }],
  ['other channel', { id: ID, channel_id: config.pipelineChannelId, timestamp: STAMP }]]) {
  test('HTTP 200 with invalid immediate receipt is uncertain, never blindly resent: ' + name, async () => {
    const f = fixture((_url, options) => options.method === 'GET' ? Response.json([]) : Response.json(data));
    await assert.rejects(f.client.sendOnce('bad-response', CHANNEL, 'synthetic'), /discord_invalid_receipt/);
    assert.equal(f.data.get('delivery:bad-response').state, 'uncertain');
    await assert.rejects(f.client.sendOnce('bad-response', CHANNEL, 'synthetic'), /delivery_uncertain_requires_review/);
    assert.equal(f.calls.filter(x => x.options.method === 'POST').length, 1);
  });
}
test('HTTP non-429 failure stays uncertain rather than treating delivery as sent', async () => {
  const f = fixture((_url, options) => options.method === 'GET' ? Response.json([])
    : Response.json({ ignored: 'synthetic' }, { status: 500 }));
  await assert.rejects(f.client.sendOnce('server-error', CHANNEL, 'synthetic'), /delivery_uncertain_requires_review/);
  assert.equal(f.data.get('delivery:server-error').state, 'uncertain');
  await assert.rejects(f.client.sendOnce('server-error', CHANNEL, 'synthetic'), /delivery_uncertain_requires_review/);
  assert.equal(f.calls.filter(x => x.options.method === 'POST').length, 1);
});
for (const [name, row] of [['unknown', reactionRecord('completed')], ['missing', {}],
  ['false', false], ['zero', 0], ['empty', '']]) {
  test('corrupt reaction state cannot cause a PUT: ' + name, async () => {
    const f = fixture(); f.data.set('reaction:state', row);
    await assert.rejects(f.client.reactOnce('state', CHANNEL, ID, '✅'), /invalid_reaction_ledger/);
    assert.equal(f.calls.length, 0);
  });
}
test('confirmed reaction requires persisted completion evidence', async () => {
  const f = fixture(); f.data.set('reaction:receipt', reactionRecord('sent'));
  await assert.rejects(f.client.reactOnce('receipt', CHANNEL, ID, '✅'), /invalid_reaction_receipt/);
  assert.equal(f.calls.length, 0);
});
test('reaction requires exact 204; same idempotent PUT may resume but not a wrong emoji', async () => {
  let attempts = 0;
  const f = fixture(() => ++attempts === 1 ? Response.json({}) : new Response(null, { status: 204 }));
  await assert.rejects(f.client.reactOnce('put', CHANNEL, ID, '✅'), /reaction_200/);
  assert.equal(f.data.get('reaction:put').state, 'sending');
  assert.deepEqual(await f.client.reactOnce('put', CHANNEL, ID, '✅'), { httpStatus: 204, duplicate: false });
  assert.deepEqual(await f.client.reactOnce('put', CHANNEL, ID, '✅'), { httpStatus: 204, duplicate: true });
  await assert.rejects(f.client.reactOnce('put', CHANNEL, ID, '🚫'), /reaction_payload_conflict/);
  assert.equal(f.calls.length, 2); assert.ok(f.calls.every(x => x.options.method === 'PUT'));
});
test('numeric message identity and unknown reaction never reach HTTP', async () => {
  const f = fixture();
  await assert.rejects(f.client.reactOnce('bad', CHANNEL, Number(ID), '✅'), /invalid_reaction/);
  await assert.rejects(f.client.reactOnce('bad', CHANNEL, ID, '❌'), /invalid_reaction/);
  assert.equal(f.calls.length, 0);
});
