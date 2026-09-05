'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { creators } = require('./creators.cjs');
const { makeClients } = require('./clients.cjs');
const config = { crmToken: 'synthetic-creator-crm-token', discordToken: 'synthetic-creator-discord-token',
  botId: '111111111111111111', guildId: '222222222222222222',
  kpiChannelId: '333333333333333333', pipelineChannelId: '444444444444444444', reactivationAfter: '2026-09-05T13:00:00.000Z' };
const NOW = '2026-09-05T15:01:00.000Z', MESSAGE_ID = '555555555555555555';
const notification = { id: 7, eventKey: 'creator-test:synthetic_1', createdAt: '2026-09-05T15:00:01.000Z',
  guildId: config.guildId, channelId: config.kpiChannelId, message: '[TEST] SOCIALPRO — CREATOR DISCOVERY\nDatos ficticios; no contactar.' };
function fixture(items = [notification], options = {}) {
  const data = new Map(), active = new Map(), calls = [];
  let ackAttempts = 0, discordPosts = 0, clock = NOW;
  const store = {
    get: async key => data.has(key) ? structuredClone(data.get(key)) : null,
    put: async (key, value) => { data.set(key, structuredClone(value)); return value; },
    lock: async (key, callback) => {
      calls.push({ lock: key });
      const previous = active.get(key) || Promise.resolve();
      const next = previous.catch(() => {}).then(callback); active.set(key, next);
      try { return await next; } finally { if (active.get(key) === next) active.delete(key); }
    },
  };
  const request = async (url, requestOptions) => {
    calls.push({ url, method: requestOptions.method, body: requestOptions.body ? JSON.parse(requestOptions.body) : null });
    if (url === 'https://socialpro.es/api/automation/discord/creator-discovery?since=' + encodeURIComponent(config.reactivationAfter)
      && requestOptions.method === 'GET') {
      return Response.json({ ok: true, notifications: options.filterSince
        ? items.filter(item => Date.parse(item.createdAt) >= Date.parse(config.reactivationAfter)).slice(0, 20) : items });
    }
    if (/^https:\/\/socialpro\.es\/api\/automation\/discord\/creator-discovery\/\d+\/ack$/.test(url)) {
      ackAttempts++;
      assert.ok(data.get('delivery:creator-discovery:' + notification.eventKey)?.state === 'sent', 'ACK requires durable Discord receipt');
      if (options.failAck && ackAttempts === 1) throw Error('synthetic_ack_timeout');
      return Response.json({ ok: true, result: options.ackResult || (ackAttempts > 1 ? 'duplicate' : 'acknowledged') });
    }
    if (url.startsWith('https://discord.com/api/v10/channels/' + config.kpiChannelId + '/messages')) {
      if (requestOptions.method === 'GET') return Response.json([]);
      discordPosts++;
      assert.equal(data.get('creator-notification:' + notification.eventKey)?.state, 'prepared', 'Plan precedes provider effect');
      if (options.uncertainSend) throw Error('synthetic_discord_timeout');
      return Response.json({ id: MESSAGE_ID, channel_id: options.wrongReceipt ? config.pipelineChannelId : config.kpiChannelId,
        timestamp: '2026-09-05T15:00:02.123000+00:00' });
    }
    throw Error('unexpected_network_destination_in_fixture');
  };
  const clients = makeClients(config, store, request);
  const ctx = { config, store, lock: store.lock, ...clients, now: () => clock };
  return { ctx, data, calls, items, clients, newContext: () => ({ ...ctx, ...makeClients(config, store, request), now: ctx.now }),
    setClock: value => { clock = value; },
    ackAttempts: () => ackAttempts, discordPosts: () => discordPosts };
}

test('empty page reads CRM only, with no Discord or ACK effect', async () => {
  const f = fixture([]), result = await creators(f.ctx);
  assert.equal(result.ok, true); assert.equal(result.delivered, 0); assert.equal(result.acknowledged, 0);
  assert.equal(f.discordPosts(), 0); assert.equal(f.ackAttempts(), 0);
  assert.deepEqual(f.calls.filter(call => call.url).map(call => call.method), ['GET']);
  assert.equal(f.calls[0].lock, 'creators');
});
test('receipt then ACK; replay and a new client over the same ledger do not deliver again', async () => {
  const f = fixture();
  const first = await creators(f.ctx);
  assert.equal(first.delivered, 1); assert.equal(first.acknowledged, 1); assert.equal(first.ok, true);
  const ack = f.calls.find(call => call.url?.endsWith('/ack'));
  assert.deepEqual(ack.body, { messageId: MESSAGE_ID, channelId: config.kpiChannelId });
  const replay = await creators(f.newContext());
  assert.equal(replay.duplicates, 1); assert.equal(f.discordPosts(), 1); assert.equal(f.ackAttempts(), 1);
});
test('concurrent wake-ups serialize through the creators lock and send once', async () => {
  const f = fixture(); await Promise.all([creators(f.ctx), creators(f.ctx)]);
  assert.equal(f.discordPosts(), 1); assert.equal(f.ackAttempts(), 1);
});
test('ACK timeout never resends Discord; next attempt acknowledges its persisted receipt', async () => {
  const f = fixture([notification], { failAck: true });
  const first = await creators(f.ctx);
  assert.equal(first.ok, false); assert.equal(first.delivered, 1); assert.equal(first.acknowledged, 0);
  const replay = await creators(f.ctx);
  assert.equal(replay.ok, true); assert.equal(replay.duplicates, 1); assert.equal(replay.acknowledged, 1);
  assert.equal(f.discordPosts(), 1); assert.equal(f.ackAttempts(), 2);
});
test('uncertain Discord send remains blocked without blind resend or ACK', async () => {
  const f = fixture([notification], { uncertainSend: true });
  for (let i = 0; i < 2; i++) {
    const result = await creators(f.ctx); assert.equal(result.ok, false);
    assert.equal(result.blocked[0].code, 'delivery_uncertain_requires_review');
  }
  assert.equal(f.discordPosts(), 1); assert.equal(f.ackAttempts(), 0);
});
test('invalid immediate receipt never authorizes an ACK', async () => {
  const f = fixture([notification], { wrongReceipt: true });
  assert.equal((await creators(f.ctx)).ok, false); assert.equal(f.ackAttempts(), 0);
});
test('historical notifications are skipped without sending, ACKing or claiming a delivery', async () => {
  const f = fixture([{ ...notification, createdAt: '2026-09-05T12:59:59.999Z' }]);
  assert.equal((await creators(f.ctx)).historicalSkipped, 1);
  assert.equal(f.discordPosts(), 0); assert.equal(f.ackAttempts(), 0);
  assert.equal([...f.data.keys()].some(key => key.startsWith('delivery:') || key.startsWith('creator-notification:')), false);
});
test('twenty historical rows do not starve a new notification when since is applied before the page limit', async () => {
  const old = Array.from({ length: 20 }, (_, index) => ({ ...notification, id: 100 + index,
    eventKey: 'creator-run:old_' + index, createdAt: '2026-09-05T12:00:00.000Z' }));
  const f = fixture([...old, notification], { filterSince: true });
  const result = await creators(f.ctx);
  assert.equal(result.ok, true); assert.equal(result.delivered, 1); assert.equal(result.acknowledged, 1);
  assert.equal(f.ackAttempts(), 1);
  assert.ok(f.calls.some(call => call.url?.endsWith('?since=' + encodeURIComponent(config.reactivationAfter))));
  assert.equal([...f.data.keys()].some(key => key.includes('old_')), false);
});
test('notification exactly at T0 is eligible under the inclusive contract', async () => {
  const f = fixture([{ ...notification, createdAt: config.reactivationAfter }]);
  assert.equal((await creators(f.ctx)).delivered, 1);
});
for (const [label, patch] of [
  ['other guild', { guildId: '999999999999999999' }], ['pipeline destination', { channelId: config.pipelineChannelId }],
  ['future', { createdAt: '2026-09-05T15:01:00.001Z' }], ['invalid date', { createdAt: '2026-02-30T12:00:00.000Z' }],
  ['numeric date', { createdAt: 0 }], ['financial event', { eventKey: 'invoice:7' }],
  ['untrusted key', { eventKey: 'creator-test:../external' }], ['empty', { message: '  ' }],
  ['oversize', { message: 'x'.repeat(1801) }], ['string id', { id: '7' }], ['extra field', { recipient: 'forbidden' }],
]) {
  test('invalid outbox item fails before effects: ' + label, async () => {
    const f = fixture([{ ...notification, ...patch }]);
    await assert.rejects(creators(f.ctx), /creator_/); assert.equal(f.discordPosts(), 0); assert.equal(f.ackAttempts(), 0);
  });
}
test('whole-page validation blocks an invalid later destination before any first-row send', async () => {
  const f = fixture([notification, { ...notification, id: 8, eventKey: 'creator-run:other', guildId: 'invalid' }]);
  await assert.rejects(creators(f.ctx), /destination/); assert.equal(f.discordPosts(), 0);
});
test('duplicate page IDs or event identities fail closed before sending', async () => {
  for (const item of [{ ...notification, eventKey: 'creator-status:other' }, { ...notification, id: 8 }]) {
    const f = fixture([notification, item]); await assert.rejects(creators(f.ctx), /duplicate_page_identity/);
    assert.equal(f.discordPosts(), 0);
  }
});
test('the same event with a changed payload cannot reuse a receipt', async () => {
  const f = fixture(); await creators(f.ctx); f.items[0] = { ...notification, message: 'Changed synthetic content' };
  assert.equal((await creators(f.ctx)).blocked[0].code, 'creator_plan_conflict'); assert.equal(f.discordPosts(), 1);
});
test('object property ordering does not change an otherwise identical notification', async () => {
  const f = fixture(); await creators(f.ctx);
  f.items[0] = Object.fromEntries(Object.entries(notification).reverse());
  assert.equal((await creators(f.ctx)).duplicates, 1); assert.equal(f.discordPosts(), 1);
});
test('unknown ACK outcome is not recorded as acknowledged', async () => {
  const f = fixture([notification], { ackResult: 'accepted' });
  assert.equal((await creators(f.ctx)).blocked[0].code, 'creator_invalid_ack');
  assert.equal(f.data.get('creator-notification:' + notification.eventKey).state, 'prepared');
});
test('an acknowledged plan without a valid retained receipt never reports a successful replay', async () => {
  const f = fixture(); await creators(f.ctx);
  const key = 'creator-notification:' + notification.eventKey;
  f.data.set(key, { ...f.data.get(key), receipt: null });
  assert.equal((await creators(f.ctx)).blocked[0].code, 'creator_invalid_receipt');
  assert.equal(f.discordPosts(), 1); assert.equal(f.ackAttempts(), 1);
});
test('family budget defers further rows, without sending or ACKing after the deadline boundary', async () => {
  const f = fixture(); const original = f.ctx.crm;
  f.ctx.crm = async (...args) => { const result = await original(...args); f.setClock('2026-09-05T15:02:30.000Z'); return result; };
  const result = await creators(f.ctx);
  assert.equal(result.ok, false); assert.equal(result.deferred, 1);
  assert.equal(f.discordPosts(), 0); assert.equal(f.ackAttempts(), 0);
});
test('unbounded or malformed pages fail closed before effects', async () => {
  for (const notifications of [null, {}, Array(21).fill(notification)]) {
    const f = fixture(); f.ctx.crm = async () => ({ ok: true, notifications });
    await assert.rejects(creators(f.ctx), /invalid_notifications/); assert.equal(f.discordPosts(), 0);
  }
});
test('1800 characters are allowed and mentions stay disabled in the existing client', async () => {
  const f = fixture([{ ...notification, message: 'x'.repeat(1800) }]);
  assert.equal((await creators(f.ctx)).delivered, 1);
  const call = f.calls.find(item => item.url?.startsWith('https://discord.com') && item.method === 'POST');
  assert.equal(call.body.content.length, 1800); assert.deepEqual(call.body.allowed_mentions, { parse: [] });
});
test('arbitrary request content cannot bypass the CRM outbox', async () => {
  const f = fixture(); await assert.rejects(creators(f.ctx, { message: 'Do not send this' }), /invalid_body/);
  assert.equal(f.calls.length, 0);
});
test('only exact new CRM routes and strict fixed-destination ACK bodies are allowed', async () => {
  const f = fixture([]);
  for (const [route, options] of [
    ['/api/automation/discord/creator-discovery/7/ack', { method: 'POST', body: { messageId: MESSAGE_ID, channelId: config.pipelineChannelId } }],
    ['/api/automation/discord/creator-discovery/7/ack', { method: 'POST', body: { messageId: MESSAGE_ID, channelId: config.kpiChannelId, extra: true } }],
    ['/api/automation/discord/creator-discovery/7/ack', { method: 'POST', body: { messageId: Number(MESSAGE_ID), channelId: config.kpiChannelId } }],
    ['/api/automation/discord/creator-discovery', { method: 'POST', body: {} }],
    ['/api/automation/invoices', { method: 'POST', body: {} }],
    ['/api/automation/discord/creator-discovery?all=true', {}],
    ['/api/automation/discord/creator-discovery?since=' + encodeURIComponent('2026-09-05T12:00:00.000Z'), {}],
    ['/api/automation/discord/creator-discovery?since=' + encodeURIComponent(config.reactivationAfter) + '&all=true', {}],
    ['/api/automation/discord/creator-discovery?since=' + config.reactivationAfter, {}],
  ]) await assert.rejects(f.clients.crm(route, options), /not_allowed|invalid_creator_ack/);
  assert.equal(f.calls.length, 0);
});
