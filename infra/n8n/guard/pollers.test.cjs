'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pollPipeline, pollKpi } = require('./pollers.cjs');
const gates = require('./gates.cjs');
const T0 = '2026-09-05T12:00:00.000Z';
const NOW = '2026-09-05T12:10:00.000Z';
const PIPELINE = '111111111111111111';
const KPI = '222222222222222222';
const ACTOR = '333333333333333333';
const OTHER = '444444444444444444';
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const idAt = (offset) => ((BigInt(Date.parse(T0) + offset) - 1420070400000n) << 22n).toString();
function msg(offset = 1000, content = 'synthetic deal', channel = PIPELINE, author = ACTOR) {
  return { id: idAt(offset), channel_id: channel, content, author: { id: author, bot: false } };
}
function ack(message, result = 'created') {
  return { ok: true, summary: { received: 1, created: result === 'created' ? 1 : 0,
    alreadySeen: result === 'already_seen' ? 1 : 0, ignored: result === 'ignored' ? 1 : 0,
    failed: result === 'failed' ? 1 : 0, draftsCreated: result === 'created' ? 1 : 0, draftsAlreadySeen: 0 },
  outcomes: [{ messageId: message.messageId, result,
    ...(result === 'created' ? { status: 'pending_review', draftId: 1 } : {}) }] };
}
function fixture(messages = [], options = {}) {
  const data = new Map();
  const effects = new Map();
  const tails = new Map();
  const events = [];
  const calls = { crm: [], reads: [], sends: [], reacts: [], external: [] };
  const ctx = {
    config: { reactivationAfter: T0, pipelineChannelId: PIPELINE,
      kpiChannelId: KPI, allowedActorIds: [ACTOR] },
    now: () => NOW,
    store: {
      get: async (key) => clone(data.get(key)),
      put: async (key, value) => {
        if (options.beforePut) await options.beforePut(key, value);
        data.set(key, clone(value)); events.push({ type: 'put', key, stage: value?.stage });
        if (options.afterPut) await options.afterPut(key, value);
      },
    },
    lock: async (key, fn) => {
      const prior = tails.get(key) ?? Promise.resolve();
      let release;
      const mine = new Promise((resolve) => { release = resolve; });
      tails.set(key, mine);
      await prior;
      try { return await fn(); } finally { release(); }
    },
    discordMessages: async (channel, request) => {
      calls.reads.push({ channel, request }); return clone(messages);
    },
    crm: async (path, request) => {
      calls.crm.push({ path, request: clone(request) }); events.push({ type: 'crm' });
      if (options.crm) return options.crm(path, request);
      return request.method === 'POST' ? ack(request.body.messages[0])
        : { ok: true, discordMessages: ['Synthetic first block', 'Synthetic second block'] };
    },
    sendOnce: async (key, channel, content) => {
      calls.sends.push({ key, channel, content }); events.push({ type: 'send', key });
      if (effects.has(key)) {
        const previous = effects.get(key);
        assert.equal(previous.content, content);
        if (previous.uncertain) throw new Error('synthetic delivery uncertainty');
        return { ...previous.receipt, duplicate: true };
      }
      const receipt = { id: idAt(500000 + calls.external.length), channelId: channel };
      const entry = { content, receipt };
      effects.set(key, entry); calls.external.push({ key, content });
      if (options.sendFailure?.(key, content)) { entry.uncertain = true; throw new Error('private-body-never-exposed'); }
      return { ...receipt, duplicate: false };
    },
    reactOnce: async (key, channel, messageId, emoji) => {
      calls.reacts.push({ key, channel, messageId, emoji }); events.push({ type: 'react', key });
      if (effects.has(key)) return { httpStatus: 204, duplicate: true };
      effects.set(key, { emoji }); calls.external.push({ key, emoji });
      return { httpStatus: 204, duplicate: false };
    },
  };
  for (const mode of ['pipeline', 'kpi']) {
    data.set('poll-' + mode + '-checkpoint', gates.createCheckpoint({ mode,
      channelId: mode === 'pipeline' ? PIPELINE : KPI, reactivationAfter: T0,
      allowedActorIds: mode === 'kpi' ? [ACTOR] : [], pageLimit: 100 }, null));
    data.set('poll-' + mode + '-pending', null);
  }
  return { ctx, data, effects, events, calls, options, messages };
}
const jobKey = (mode, offset = 1000) => 'poll-' + mode + '-message-' + idAt(offset);

test('no new messages has no CRM, Discord output, invoice or model operation', async () => {
  const f = fixture([msg(-1), msg(0)]);
  const result = await pollPipeline(f.ctx);
  assert.equal(result.ok, true);
  assert.equal(result.noNewMessages, true);
  assert.equal(f.calls.crm.length + f.calls.external.length, 0);
  assert.deepEqual(f.calls.reads[0].request, { limit: 100 });
});
test('missing checkpoint never bootstraps or resets to T0 during a request', async () => {
  const f = fixture([msg()]);
  f.data.delete('poll-pipeline-checkpoint');
  await assert.rejects(pollPipeline(f.ctx), /poller:checkpoint_missing/);
  assert.equal(f.calls.reads.length + f.calls.crm.length + f.calls.external.length, 0);
  assert.equal(f.data.has('poll-pipeline-checkpoint'), false);
});
test('pipeline posts one schema-valid message at a time; repeat poll has no effects', async () => {
  const f = fixture([msg(2000), msg(1000)]);
  await pollPipeline(f.ctx);
  assert.equal(f.calls.crm.length, 2);
  for (const call of f.calls.crm) {
    assert.equal(call.path, '/api/automation/discord/pipeline-deals');
    assert.equal(call.request.method, 'POST');
    assert.deepEqual(Object.keys(call.request.body), ['messages']);
    assert.equal(call.request.body.messages.length, 1); // schema limit is 25
    assert.deepEqual(Object.keys(call.request.body.messages[0]), ['messageId', 'channelId', 'authorId', 'content']);
  }
  assert.equal(f.calls.reacts.length, 2);
  assert.equal(f.data.get('poll-pipeline-checkpoint').cursor, idAt(2000));
  await pollPipeline(f.ctx);
  assert.equal(f.calls.crm.length, 2);
  assert.equal(f.calls.external.length, 2);
});
test('ignored and already_seen pipeline outcomes do not react', async () => {
  for (const result of ['ignored', 'already_seen']) {
    const f = fixture([msg()], { crm: async (path, request) => ack(request.body.messages[0], result) });
    await pollPipeline(f.ctx);
    assert.equal(f.calls.reacts.length, 0);
    assert.equal(f.data.get('poll-pipeline-checkpoint').cursor, idAt(1000));
  }
});
test('HTTP200 partial fails and cannot advance cursor or retry the POST blindly', async () => {
  const f = fixture([msg()], { crm: async (path, request) => ack(request.body.messages[0], 'failed') });
  await assert.rejects(pollPipeline(f.ctx), /poller:crm_response_invalid_or_unpersisted/);
  assert.equal(f.data.get('poll-pipeline-checkpoint').cursor, null);
  assert.equal(f.calls.external.length, 0);
  await assert.rejects(pollPipeline(f.ctx), /poller:job_requires_review/);
  assert.equal(f.calls.crm.length, 1);
});
test('POST acceptance lost freezes pending job and does not repost on restart', async () => {
  const f = fixture([msg()], { crm: async () => { throw new Error('private synthetic response'); } });
  await assert.rejects(pollPipeline(f.ctx), /poller:crm_acceptance_uncertain/);
  assert.equal(f.data.get(jobKey('pipeline')).stage, 'uncertain');
  await assert.rejects(pollPipeline(f.ctx), /poller:job_requires_review/);
  assert.equal(f.calls.crm.length, 1);
});
test('pipeline caches response before reaction and can recover a cached ready plan', async () => {
  let failOnce = true;
  const f = fixture([msg()], { afterPut: async (key, value) => {
    if (failOnce && key === jobKey('pipeline') && value.stage === 'ready') {
      failOnce = false; throw new Error('synthetic write acknowledgement lost');
    }
  } });
  await assert.rejects(pollPipeline(f.ctx), /poller:operation_failed/);
  assert.equal(f.calls.reacts.length, 0);
  f.messages.length = 0; // source no longer in the newest page
  await pollPipeline(f.ctx);
  assert.equal(f.calls.crm.length, 1);
  assert.equal(f.calls.reacts.length, 1);
  const ready = f.events.findIndex((event) => event.type === 'put' && event.stage === 'ready');
  const send = f.events.findIndex((event) => event.type === 'react');
  assert.ok(ready >= 0 && ready < send);
});
test('a full latest100 page after T0 is held without losing messages or resetting cutoff', async () => {
  const f = fixture(Array.from({ length: 100 }, (_, index) => msg(index + 1)));
  await assert.rejects(pollPipeline(f.ctx), /restoration_gate:page_gap_requires_review/);
  assert.equal(f.calls.crm.length + f.calls.external.length, 0);
  assert.equal(f.data.get('poll-pipeline-checkpoint').cursor, null);
  assert.equal(f.data.get('poll-pipeline-checkpoint').policy.reactivationAfter, T0);
});
test('KPI only new allowed human reads; all invoice aliases ignored before HTTP', async () => {
  const f = fixture([
    msg(1000, 'ok', KPI), msg(2000, 'zack ok', KPI), msg(3000, 'ok facturar', KPI),
    msg(4000, 'zack facturar', KPI), msg(5000, 'zack crea las facturas', KPI),
    msg(6000, 'zack revisa', KPI, OTHER),
    { ...msg(7000, 'zack revisa', KPI), author: { id: ACTOR, bot: true } },
  ]);
  const result = await pollKpi(f.ctx);
  assert.equal(result.financialBlocked, 5);
  assert.equal(result.unauthorized, 1);
  assert.equal(f.calls.crm.length + f.calls.external.length, 0);
  assert.equal(f.data.get('poll-kpi-checkpoint').cursor, idAt(7000));
});
test('KPI help, review and detail use GET and never perform financial writes', async () => {
  const f = fixture([msg(1000, 'zack ayuda', KPI), msg(2000, 'zack revisa', KPI),
    msg(3000, 'zack detalle Synthetic Éxample', KPI)]);
  await pollKpi(f.ctx);
  assert.equal(f.calls.crm.length, 3);
  assert.ok(f.calls.crm.every((call) => call.request.method === 'GET'
    && !Object.hasOwn(call.request, 'body') && call.path.startsWith('/api/automation/deals/digest')));
  assert.match(f.calls.crm[2].path, /Synthetic%20%C3%89xample$/);
  assert.match(f.calls.external[0].content, /Facturación desactivada/);
  await pollKpi(f.ctx);
  assert.equal(f.calls.crm.length, 3);
  assert.equal(f.calls.external.length, 5);
});
test('KPI 80 character query accepted; 81 is ignored before HTTP', async () => {
  const f = fixture([msg(1000, 'zack detalle ' + 'a'.repeat(80), KPI),
    msg(2000, 'zack detalle ' + 'a'.repeat(81), KPI)]);
  await pollKpi(f.ctx);
  assert.equal(f.calls.crm.length, 1);
  assert.equal(decodeURIComponent(f.calls.crm[0].path.split('?q=')[1]).length, 80);
});
test('KPI partial or missing response does not send nor report success', async () => {
  for (const response of [{ ok: false }, { ok: true, discordMessages: [] },
    { ok: true, partial: true, discordMessages: ['synthetic'] }]) {
    const f = fixture([msg(1000, 'zack revisa', KPI)], { crm: async () => response });
    await assert.rejects(pollKpi(f.ctx), /poller:crm_response_invalid_or_unpersisted/);
    assert.equal(f.calls.external.length, 0);
  }
});
test('KPI GET failure may retry only the frozen read before any send', async () => {
  let attempts = 0;
  const f = fixture([msg(1000, 'zack revisa', KPI)], { crm: async () => {
    attempts += 1; if (attempts === 1) throw new Error('synthetic');
    return { ok: true, discordMessages: ['synthetic recovery'] };
  } });
  await assert.rejects(pollKpi(f.ctx), /poller:crm_read_failed/);
  await pollKpi(f.ctx);
  assert.equal(f.calls.crm.length, 2);
  assert.equal(f.calls.external.length, 1);
});
test('KPI partial delivery keeps frozen parts and holds uncertainty without second send', async () => {
  const f = fixture([msg(1000, 'zack revisa', KPI)],
    { sendFailure: (key) => key.endsWith('-1') });
  await assert.rejects(pollKpi(f.ctx), /poller:discord_delivery_uncertain/);
  assert.equal(f.calls.external.length, 2);
  assert.equal(f.data.get(jobKey('kpi')).receipts.length, 1);
  await assert.rejects(pollKpi(f.ctx), /poller:job_requires_review/);
  assert.equal(f.calls.external.length, 2);
  assert.equal(f.calls.crm.length, 1);
});
test('receipt-write failure recovers via delivery ledger without refetching/changing content', async () => {
  let failOnce = true;
  const f = fixture([msg(1000, 'zack revisa', KPI)], { beforePut: async (key, value) => {
    if (failOnce && key === jobKey('kpi') && value.stage === 'ready' && value.receipts.length === 1) {
      failOnce = false; throw new Error('synthetic disk write failure');
    }
  } });
  await assert.rejects(pollKpi(f.ctx), /poller:operation_failed/);
  f.options.crm = async () => ({ ok: true, discordMessages: ['must not replace frozen parts'] });
  await pollKpi(f.ctx);
  assert.equal(f.calls.crm.length, 1);
  assert.equal(f.calls.sends.length, 3); // one duplicate ledger lookup, two actual sends
  assert.deepEqual(f.calls.external.map((entry) => entry.content),
    ['Synthetic first block', 'Synthetic second block']);
});
test('concurrent poll calls are serialized and do not double process', async () => {
  const f = fixture([msg()]);
  const results = await Promise.all([pollPipeline(f.ctx), pollPipeline(f.ctx)]);
  assert.ok(results.every((result) => result.ok));
  assert.equal(f.calls.crm.length, 1);
  assert.equal(f.calls.external.length, 1);
});
test('changed T0 and changed allowlist fail before any HTTP', async () => {
  const f = fixture([]);
  await pollKpi(f.ctx);
  const reads = f.calls.reads.length;
  f.ctx.config.reactivationAfter = '2026-09-05T12:00:01.000Z';
  await assert.rejects(pollKpi(f.ctx), /restoration_gate:policy_changed/);
  f.ctx.config.reactivationAfter = T0; f.ctx.config.allowedActorIds = [OTHER];
  await assert.rejects(pollKpi(f.ctx), /restoration_gate:policy_changed/);
  assert.equal(f.calls.reads.length, reads);
});
test('corrupt pending cursor cannot send an old prepared job', async () => {
  const f = fixture([msg()], { crm: async () => { throw new Error('synthetic'); } });
  await assert.rejects(pollPipeline(f.ctx));
  const job = f.data.get(jobKey('pipeline'));
  f.data.set(jobKey('pipeline'), { ...job, stage: 'prepared' });
  const current = f.data.get('poll-pipeline-checkpoint');
  f.data.set('poll-pipeline-checkpoint', { ...current, cursor: idAt(2000) });
  await assert.rejects(pollPipeline(f.ctx), /poller:pending_cursor_conflict/);
  assert.equal(f.calls.crm.length, 1);
});
test('corrupt confirmed reply with no receipt is rejected by promoted helper', () => {
  const config = { mode: 'kpi', channelId: KPI, reactivationAfter: T0,
    allowedActorIds: [ACTOR], pageLimit: 100 };
  const current = gates.createCheckpoint(config, null);
  current.deliveries = [{ sourceMessageId: idAt(1000), kind: 'reply', part: 0,
    state: 'confirmed', receiptId: null }];
  assert.throws(() => gates.selectMessages([], config, current, NOW), /invalid_receipt/);
});
