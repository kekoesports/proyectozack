'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { partners, initialPartnerRollout, ROLLOUT_KEY } = require('./partners.cjs');
const { makeClients } = require('./clients.cjs');
const config = { crmToken: 'synthetic-partner-crm-token', discordToken: 'synthetic-partner-discord-token',
  botId: '111111111111111111', guildId: '222222222222222222',
  kpiChannelId: '333333333333333333', pipelineChannelId: '444444444444444444', reactivationAfter: '2026-09-05T13:00:00.000Z' };
const NOW = '2026-09-06T15:01:00.000Z', ACTIVATED = '2026-09-06T14:00:00.000Z', MESSAGE = '555555555555555555';
const notification = { batchId: 7, guildId: config.guildId, channelId: config.kpiChannelId,
  message: '[TEST SocialPro Partner Radar] Sin candidatos ni contacto comercial.' };
function fixture(items = [notification], options = {}) {
  const data = new Map([[ROLLOUT_KEY, initialPartnerRollout(config, ACTIVATED, options.ceiling || 0)]]);
  const locks = new Map(), calls = []; let sends = 0, acks = 0, clock = NOW;
  const store = {
    get: async key => data.has(key) ? structuredClone(data.get(key)) : null,
    put: async (key, value) => { data.set(key, structuredClone(value)); },
    lock: async (key, fn) => {
      const previous = locks.get(key) || Promise.resolve(), current = previous.catch(() => {}).then(fn);
      locks.set(key, current); try { return await current; } finally { if (locks.get(key) === current) locks.delete(key); }
    },
  };
  const request = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    if (url.startsWith('https://socialpro.es/')) return Response.json(await crm(url.slice('https://socialpro.es'.length), {
      method: init.method, ...(init.body ? { body: JSON.parse(init.body) } : {}),
    }));
    assert.ok(url.startsWith('https://discord.com/api/v10/channels/' + config.kpiChannelId + '/messages'));
    if (init.method === 'GET') return Response.json([]);
    sends++;
    assert.ok([...data].some(([key, plan]) => key.startsWith('partner-notification:') && plan.state === 'prepared'));
    if (options.uncertainSend) throw Error('synthetic_send_timeout');
    return Response.json({ id: MESSAGE, channel_id: options.wrongReceipt ? config.pipelineChannelId : config.kpiChannelId,
      timestamp: options.receiptTime || '2026-09-06T15:00:00.123000+00:00' });
  };
  // Intercept HTTP only. Both CRM route/body allowlisting and sendOnce run through the real client.
  const crm = async (route, init = {}) => {
    if (route === '/api/automation/discord/partner-leads' && (init.method || 'GET') === 'GET') {
      return { ok: true, configured: options.configured !== false, notifications: items };
    }
    assert.match(route, /^\/api\/automation\/discord\/partner-leads\/[1-9]\d*\/ack$/);
    assert.equal(init.method, 'POST'); assert.deepEqual(init.body, {}); acks++;
    const batchId = Number(route.split('/').at(-2));
    assert.equal(data.get('partner-notification:' + batchId)?.state, 'delivered');
    assert.equal(data.get('delivery:partner-radar:' + batchId)?.state, 'sent');
    if (options.failAck && acks === 1) throw Error('synthetic_ack_timeout');
    return options.ack || { ok: true, acknowledged: acks === 1 };
  };
  const ctx = { config, store, lock: store.lock, ...makeClients(config, store, request), now: () => clock };
  return { ctx, data, items, calls, sends: () => sends, acks: () => acks,
    fresh: () => ({ ...ctx, ...makeClients(config, store, request), now: ctx.now }),
    setClock: value => { clock = value; } };
}
test('empty configured queue reads only; no send/ACK', async () => {
  const f = fixture([]), result = await partners(f.ctx);
  assert.equal(result.ok, true); assert.equal(f.sends(), 0); assert.equal(f.acks(), 0);
  assert.equal(f.calls.length, 1);
});
test('real client receipt is durable before ACK; replay/restart sends no duplicate', async () => {
  const f = fixture(); assert.equal((await partners(f.ctx)).delivered, 1);
  assert.equal((await partners(f.fresh())).duplicates, 1);
  assert.equal(f.sends(), 1); assert.equal(f.acks(), 1);
  const plan = f.data.get('partner-notification:7'); assert.equal(plan.receipt.id, MESSAGE);
  assert.equal(plan.state, 'acknowledged');
});
test('concurrent webhook and scheduler wake-ups serialize', async () => {
  const f = fixture(); await Promise.all([partners(f.ctx), partners(f.ctx)]);
  assert.equal(f.sends(), 1); assert.equal(f.acks(), 1);
});
test('lost ACK preserves receipt and retries ACK without calling send again', async () => {
  const f = fixture([notification], { failAck: true });
  assert.equal((await partners(f.ctx)).ok, false);
  assert.equal(f.data.get('partner-notification:7').state, 'delivered');
  assert.equal((await partners(f.fresh())).acknowledged, 1);
  assert.equal(f.sends(), 1); assert.equal(f.acks(), 2);
});
test('uncertain send cannot be retried blindly and never ACKs', async () => {
  const f = fixture([notification], { uncertainSend: true });
  for (let i = 0; i < 2; i++) assert.equal((await partners(f.ctx)).blocked[0].code, 'delivery_uncertain_requires_review');
  assert.equal(f.sends(), 1); assert.equal(f.acks(), 0);
});
test('missing rollover state never auto-initializes or reads CRM', async () => {
  const f = fixture(); f.data.delete(ROLLOUT_KEY);
  await assert.rejects(partners(f.ctx), /rollout_missing_or_invalid/); assert.equal(f.calls.length, 0);
});
test('rollout ceiling, date and destination tampering fails closed', async () => {
  for (const patch of [{ maxHistoricalBatchId: -1 }, { activatedAt: '2026-09-07T00:00:00.000Z' },
    { channelId: config.pipelineChannelId }, { hash: 'changed' }]) {
    const f = fixture(); f.data.set(ROLLOUT_KEY, { ...f.data.get(ROLLOUT_KEY), ...patch });
    await assert.rejects(partners(f.ctx), /partner_/); assert.equal(f.calls.length, 0);
  }
});
test('historical IDs are retained without claim or ACK; next new ID is eligible', async () => {
  const f = fixture([{ ...notification, batchId: 6 }, notification], { ceiling: 6 });
  const result = await partners(f.ctx);
  assert.equal(result.historicalSkipped, 1); assert.equal(result.delivered, 1);
  assert.equal(f.data.has('partner-notification:6'), false); assert.equal(f.acks(), 1);
});
test('full historical page signals blocked pagination without fake ACK', async () => {
  const f = fixture(Array.from({ length: 25 }, (_, i) => ({ ...notification, batchId: i + 1 })), { ceiling: 25 });
  const result = await partners(f.ctx);
  assert.equal(result.ok, false); assert.equal(result.pageBlocked, 'partner_historical_page_limit');
  assert.equal(f.sends(), 0); assert.equal(f.acks(), 0);
});
for (const [name, patch] of [['other guild', { guildId: '999999999999999999' }],
  ['other channel', { channelId: config.pipelineChannelId }], ['string ID', { batchId: '7' }],
  ['zero ID', { batchId: 0 }], ['extra field', { recipient: 'outside' }],
  ['empty message', { message: ' ' }], ['oversized message', { message: 'x'.repeat(1901) }]]) {
  test('invalid notification blocks all sends: ' + name, async () => {
    const f = fixture([{ ...notification, ...patch }]);
    await assert.rejects(partners(f.ctx), /partner_/); assert.equal(f.sends(), 0); assert.equal(f.acks(), 0);
  });
}
test('invalid later item and duplicate IDs block first-row delivery', async () => {
  for (const second of [notification, { ...notification, batchId: 8, guildId: 'wrong' }]) {
    const f = fixture([notification, second]); await assert.rejects(partners(f.ctx), /partner_/);
    assert.equal(f.sends(), 0);
  }
});
test('same batch ID with changed content conflicts before a new earlier item sends', async () => {
  const f = fixture(); await partners(f.ctx);
  f.items.splice(0, 1, { ...notification, batchId: 8 }, { ...notification, message: 'Changed' });
  await assert.rejects(partners(f.ctx), /plan_conflict/); assert.equal(f.sends(), 1);
});
test('property order does not change fingerprint', async () => {
  const f = fixture(); await partners(f.ctx); f.items[0] = Object.fromEntries(Object.entries(notification).reverse());
  assert.equal((await partners(f.ctx)).duplicates, 1);
});
test('unconfigured CRM, malformed or excessive page fails closed', async () => {
  const unconfigured = fixture([], { configured: false }); await assert.rejects(partners(unconfigured.ctx), /invalid_notifications/);
  for (const items of [null, {}, Array(26).fill(notification)]) {
    const f = fixture(items); await assert.rejects(partners(f.ctx), /invalid_notifications/); assert.equal(f.sends(), 0);
  }
});
test('unrecognized ACK shape/outcome never records acknowledgement', async () => {
  for (const ack of [{ ok: true }, { ok: true, acknowledged: 'yes' }, { ok: true, acknowledged: true, id: 7 }]) {
    const f = fixture([notification], { ack }); assert.equal((await partners(f.ctx)).blocked[0].code, 'partner_invalid_ack');
    assert.equal(f.data.get('partner-notification:7').state, 'delivered');
  }
});
test('invalid, pre-rollout or future receipt never permits ACK', async () => {
  for (const options of [{ wrongReceipt: true }, { receiptTime: '2026-09-05T15:00:00Z' },
    { receiptTime: '2026-09-07T15:00:00Z' }]) {
    const f = fixture([notification], options); assert.equal((await partners(f.ctx)).ok, false); assert.equal(f.acks(), 0);
  }
});
test('corrupt retained receipt cannot report a successful replay', async () => {
  const f = fixture(); await partners(f.ctx);
  f.data.get('partner-notification:7').receipt = null;
  await assert.rejects(partners(f.ctx), /invalid_receipt/); assert.equal(f.sends(), 1);
});
test('1900 characters use existing mention-free delivery without splitting', async () => {
  const f = fixture([{ ...notification, message: 'x'.repeat(1900) }]); await partners(f.ctx);
  const send = f.calls.find(call => call.url && call.method === 'POST');
  assert.equal(send.body.content.length, 1900); assert.deepEqual(send.body.allowed_mentions, { parse: [] });
});
test('request payload cannot inject message/destination/pagination', async () => {
  for (const body of [null, [], { message: 'injected' }, { since: ACTIVATED }, { maxHistoricalBatchId: 0 }]) {
    const f = fixture(); await assert.rejects(partners(f.ctx, body), /invalid_body/); assert.equal(f.calls.length, 0);
  }
});
test('90 second dispatch budget defers without new delivery', async () => {
  const f = fixture(); const original = f.ctx.crm;
  f.ctx.crm = async (...args) => { const response = await original(...args); f.setClock('2026-09-06T15:02:30.000Z'); return response; };
  const result = await partners(f.ctx); assert.equal(result.ok, false); assert.equal(result.deferred, 1); assert.equal(f.sends(), 0);
});
test('unknown error text cannot enter status or response', async () => {
  const f = fixture(); f.ctx.sendOnce = async () => { throw Error('secret_business_token_1'); };
  const result = await partners(f.ctx); assert.equal(result.blocked[0].code, 'partner_operation_failed');
  assert.equal(JSON.stringify(result).includes('secret_business_token_1'), false);
});
