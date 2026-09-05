'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { makeStore } = require('./store.cjs');
const { makeClients } = require('./clients.cjs');
const { progress, initialState } = require('./progress.cjs');
const STATE = 'progress-future:v1';
const config = { kpiChannelId: '1533123515023360114', pipelineChannelId: '1533123521574862991',
  botId: '1522251019856121997', discordToken: 'synthetic-token', crmToken: 'synthetic-token',
  reactivationAfter: '2026-09-05T12:00:00.000Z' };
function row(id, pct, observedAt) {
  return { campaignId: id, progressPct: pct, currentCount: pct, targetCount: 100,
    lastSyncedAt: observedAt, syncError: null, trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/synthetic-' + id,
    name: 'PRIVATE_NAME_SENTINEL', amountBrand: 'PRIVATE_AMOUNT_SENTINEL' };
}
async function fixture(t, initialized = true) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'socialpro-progress-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = makeStore(dir); await store.ready();
  if (initialized) await store.put(STATE, initialState(config));
  const f = { now: '2026-09-05T13:00:00.000Z', rows: [], routes: [], posts: [], acks: [], receipts: [],
    syncCalls: 0, readCalls: 0, failed: 0, readFails: 0, ackFails: 0, sendFails: 0, syncFails: 0,
    total: 1, syncAlerts: [], invalidAck: false, invalidReceipt: false };
  const clients = makeClients(config, store, async (url, options) => {
    assert.ok(url.startsWith('https://discord.com/api/v10/channels/' + config.kpiChannelId));
    if (options.method === 'GET') return Response.json(f.receipts);
    assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body);
    f.posts.push(body);
    if (f.sendFails > 0) { f.sendFails--; throw Error('synthetic_send_timeout'); }
    const result = { id: String(1543182046485917700n + BigInt(f.posts.length)),
      channel_id: config.kpiChannelId, timestamp: f.now, content: body.content, nonce: body.nonce,
      author: { id: config.botId } };
    f.receipts.push(result);
    return Response.json(f.invalidReceipt ? { ...result, timestamp: 'invalid' } : result);
  });
  f.ctx = { config: { ...config }, store, lock: store.lock, sendOnce: clients.sendOnce, now: () => f.now,
    crm: async (route, options = {}) => {
      f.routes.push({ route, method: options.method || 'GET', body: options.body });
      if (route === '/api/automation/deals/sync') {
        assert.deepEqual(options, { method: 'POST', body: {} }); f.syncCalls++;
        if (f.syncFails > 0) { f.syncFails--; throw Error('synthetic_sync_timeout'); }
        return { ok: true, total: f.total, synced: f.total - f.failed, failed: f.failed, alerts: f.syncAlerts };
      }
      if (route === '/api/automation/deals/digest') {
        assert.equal(options.method, undefined); f.readCalls++;
        if (f.readFails > 0) { f.readFails--; throw Error('synthetic_read_error'); }
        return { ok: true, generatedAt: f.now, summary: { total: f.rows.length, excludedOldCompleted: 2 }, deals: f.rows };
      }
      const match = route.match(/^\/api\/automation\/deals\/([1-9]\d*)\/alerts\/ack$/);
      assert.ok(match, 'no invoices/reminders/email/other CRM path');
      assert.equal(options.method, 'POST');
      assert.deepEqual(Object.keys(options.body), ['level']);
      f.acks.push({ id: Number(match[1]), level: options.body.level });
      if (f.ackFails > 0) { f.ackFails--; throw Error('synthetic_ack_timeout'); }
      return { ok: true, progress: { campaignId: Number(match[1]), alertLevel: f.invalidAck ? 0 : options.body.level } };
    } };
  f.advance = (hour, pct, id = 1) => {
    f.now = '2026-09-05T' + String(hour).padStart(2, '0') + ':00:00.000Z';
    f.rows = [row(id, pct, f.now)];
  };
  f.rows = [row(1, 60, f.now)];
  return f;
}
test('first baseline suppresses every old 70/80/100 alert and stores no names/amounts', async t => {
  const f = await fixture(t); f.rows = [row(1, 70, f.now), row(2, 80, f.now), row(3, 100, f.now)];
  f.syncAlerts = f.rows.map(r => ({ campaignId: r.campaignId, level: r.progressPct }));
  const result = await progress(f.ctx);
  assert.equal(result.ok, true); assert.equal(result.baselineEstablished, 3);
  assert.equal(result.historicalAlertsIgnored, 3); assert.equal(result.alertsDelivered, 0);
  assert.equal(result.completePortfolioSync, false); assert.equal(result.batchMaximum, 24);
  assert.equal(f.posts.length, 0); assert.equal(f.acks.length, 0);
  assert.equal(JSON.stringify(await f.ctx.store.get(STATE)).includes('PRIVATE_'), false);
});
test('fresh 70 then 80 then 100 crosses once each; same-hour replay has no effect', async t => {
  const f = await fixture(t); await progress(f.ctx);
  for (const [hour, pct] of [[14, 70], [15, 85], [16, 100]]) {
    f.advance(hour, pct);
    const result = await progress(f.ctx); assert.equal(result.alertsDelivered, 1);
    const before = [f.syncCalls, f.posts.length, f.acks.length];
    assert.equal((await progress(f.ctx)).duplicate, true);
    assert.deepEqual([f.syncCalls, f.posts.length, f.acks.length], before);
  }
  assert.deepEqual(f.acks.map(a => a.level), [70, 80, 100]);
  assert.ok(f.posts.every(p => !p.content.includes('PRIVATE_')));
});
test('jump to 100 sends only the highest new milestone; regressions do not replay levels', async t => {
  const f = await fixture(t); await progress(f.ctx);
  f.advance(14, 100); await progress(f.ctx);
  f.advance(15, 60); await progress(f.ctx);
  f.advance(16, 100); await progress(f.ctx);
  assert.equal(f.posts.length, 1); assert.deepEqual(f.acks, [{ id: 1, level: 100 }]);
});
test('second rotating batch establishes provisional baseline, never historical completion', async t => {
  const f = await fixture(t);
  f.rows.push(row(2, 0, '2026-09-01T10:00:00.000Z'));
  const first = await progress(f.ctx); assert.equal(first.provisional, 1);
  f.advance(14, 100, 2); await progress(f.ctx);
  assert.equal(f.posts.length, 0); assert.equal(f.acks.length, 0);
  assert.equal((await f.ctx.store.get(STATE)).baselines['2'].verified, true);
});
test('missing observations do not become zero; a returning campaign establishes baseline again', async t => {
  const f = await fixture(t); await progress(f.ctx);
  f.advance(14, 70); f.rows[0].syncError = 'synthetic_failure';
  const unavailable = await progress(f.ctx); assert.equal(unavailable.unavailable, 1);
  assert.equal((await f.ctx.store.get(STATE)).baselines['1'].progressPct, 60);
  f.advance(15, 80); await progress(f.ctx); assert.equal(f.posts.length, 0);
  f.advance(16, 100); await progress(f.ctx); assert.equal(f.posts.length, 1);
});
test('target or sheet change rebaselines without an apparent percentage-growth alert', async t => {
  const f = await fixture(t); await progress(f.ctx);
  f.advance(14, 100); f.rows[0].trackingSheetUrl += '-replacement'; await progress(f.ctx);
  f.advance(15, 80); f.rows[0].targetCount = 200; f.rows[0].currentCount = 160;
  await progress(f.ctx); assert.equal(f.posts.length, 0);
});
test('failed digest read retries only GET after persisted successful sync, no invented PASS', async t => {
  const f = await fixture(t); f.readFails = 1;
  await assert.rejects(progress(f.ctx), /synthetic_read_error/);
  assert.equal((await f.ctx.store.get(STATE)).lastSlot, null);
  assert.equal((await progress(f.ctx)).ok, true);
  assert.equal(f.syncCalls, 1); assert.equal(f.readCalls, 2); assert.equal(f.posts.length, 0);
});
test('partial sync is failed and cached, leaves baseline unchanged and does not ACK old alerts', async t => {
  const f = await fixture(t); await progress(f.ctx);
  f.advance(14, 80); f.failed = 1; f.rows[0].syncError = 'synthetic_failure';
  const result = await progress(f.ctx); assert.equal(result.ok, false);
  assert.equal(result.alertsDelivered, 0); assert.equal(f.readCalls, 2);
  assert.equal((await f.ctx.store.get(STATE)).baselines['1'].progressPct, 60);
  assert.equal((await progress(f.ctx)).ok, false); assert.equal(f.syncCalls, 2);
  assert.equal(f.acks.length, 0);
});
test('first partial batch establishes only healthy fresh baselines, with no historical messages', async t => {
  const f = await fixture(t); f.total = 24; f.failed = 1;
  f.rows = Array.from({ length: 23 }, (_, i) => row(i + 1, 100, f.now));
  f.rows.push({ ...row(24, 80, f.now), syncError: 'synthetic_503' },
    row(25, 60, '2026-09-01T10:00:00.000Z'));
  const result = await progress(f.ctx);
  assert.equal(result.ok, false); assert.equal(result.failed, 1); assert.equal(result.synced, 23);
  assert.equal(result.baselineEstablished, 23); assert.equal(result.deferredNotFresh, 1);
  assert.equal(Object.keys((await f.ctx.store.get(STATE)).baselines).length, 23);
  assert.equal(f.posts.length, 0); assert.equal(f.acks.length, 0);
});
test('persistent one-sheet failure does not block fresh healthy milestones, nor change failed or stale baselines', async t => {
  const f = await fixture(t); f.total = 3;
  f.rows = [row(1, 60, f.now), row(2, 60, f.now), row(3, 60, f.now)];
  await progress(f.ctx);
  const before = (await f.ctx.store.get(STATE)).baselines;
  for (const [hour, pct] of [[14, 70], [15, 80]]) {
    f.advance(hour, pct); f.failed = 1;
    f.rows.push({ ...row(2, 100, f.now), syncError: 'synthetic_503' },
      row(3, 80, '2026-09-05T13:30:00.000Z'));
    const result = await progress(f.ctx);
    assert.equal(result.ok, false); assert.equal(result.failed, 1); assert.equal(result.alertsDelivered, 1);
    const after = (await f.ctx.store.get(STATE)).baselines;
    assert.deepEqual(after['2'], before['2']); assert.deepEqual(after['3'], before['3']);
    assert.equal(after['1'].progressPct, pct);
    assert.equal((await progress(f.ctx)).duplicate, true);
  }
  assert.deepEqual(f.acks, [{ id: 1, level: 70 }, { id: 1, level: 80 }]);
  assert.equal(f.posts.length, 2);
});
test('partial sync plus failed digest stays unfinalized; GET retry does not repeat sync', async t => {
  const f = await fixture(t); f.total = 2; f.failed = 1; f.readFails = 1;
  f.rows.push({ ...row(2, 100, f.now), syncError: 'synthetic_503' });
  await assert.rejects(progress(f.ctx), /synthetic_read_error/);
  assert.deepEqual((await f.ctx.store.get(STATE)).baselines, {});
  assert.equal((await f.ctx.store.get(STATE)).lastSlot, null);
  const retry = await progress(f.ctx);
  assert.equal(retry.ok, false); assert.equal(retry.baselineEstablished, 1);
  assert.equal(f.syncCalls, 1); assert.equal(f.readCalls, 2); assert.equal(f.posts.length, 0);
});
test('legacy completed partial job is not reprocessed; replay only restores observability', async t => {
  const f = await fixture(t);
  const slot = f.now.slice(0, 13), key = STATE + ':slot:' + slot;
  const old = { slot, startedAt: f.now, stage: 'done', sync: { total: 24, synced: 23, failed: 1 },
    result: { ok: false, total: 24, synced: 23, failed: 1, alertsDelivered: 0, at: f.now } };
  const state = { ...initialState(config), lastSlot: slot };
  await f.ctx.store.put(key, old); await f.ctx.store.put(STATE, state);
  const replay = await progress(f.ctx);
  assert.equal(replay.duplicate, true); assert.equal(replay.ok, false);
  assert.deepEqual(await f.ctx.store.get(key), old); assert.deepEqual(await f.ctx.store.get(STATE), state);
  assert.deepEqual(await f.ctx.store.get('status:progress'), old.result);
  assert.equal(f.routes.length, 0); assert.equal(f.posts.length, 0); assert.equal(f.acks.length, 0);
});
test('unknown sync acceptance blocks automatic retry, including next hour', async t => {
  const f = await fixture(t); f.syncFails = 1;
  await assert.rejects(progress(f.ctx), /sync_uncertain_requires_review/);
  f.advance(14, 80);
  await assert.rejects(progress(f.ctx), /sync_uncertain_requires_review/);
  assert.equal(f.syncCalls, 1); assert.equal(f.posts.length, 0);
});
test('ACK timeout retries idempotent ACK only, no second Discord call or new sync', async t => {
  const f = await fixture(t); await progress(f.ctx);
  f.advance(14, 80); f.ackFails = 1;
  await assert.rejects(progress(f.ctx), /synthetic_ack_timeout/);
  assert.equal(f.posts.length, 1); const before = f.syncCalls;
  // Resume even after the hour changes, using frozen plan rather than new data.
  f.advance(15, 100);
  assert.equal((await progress(f.ctx)).ok, true);
  assert.equal(f.posts.length, 1); assert.equal(f.syncCalls, before);
  assert.deepEqual(f.acks, [{ id: 1, level: 80 }, { id: 1, level: 80 }]);
});
test('invalid ACK never certifies completion; correcting response does not resend', async t => {
  const f = await fixture(t); await progress(f.ctx);
  f.advance(14, 70); f.invalidAck = true;
  await assert.rejects(progress(f.ctx), /invalid_ack/);
  assert.equal((await f.ctx.store.get(STATE)).lastSlot, '2026-09-05T13');
  f.invalidAck = false; await progress(f.ctx); assert.equal(f.posts.length, 1);
});
test('Discord timeout leaves durable planned item and cannot trigger ACK or blind repost', async t => {
  const f = await fixture(t); await progress(f.ctx);
  f.advance(14, 70); f.sendFails = 1;
  await assert.rejects(progress(f.ctx), /uncertain/);
  await assert.rejects(progress(f.ctx), /uncertain/);
  assert.equal(f.posts.length, 1); assert.equal(f.acks.length, 0);
});
test('lost write acknowledgement after delivery recovers sendOnce receipt, not a second send', async t => {
  const f = await fixture(t); await progress(f.ctx); f.advance(14, 70);
  const originalPut = f.ctx.store.put; let failed = false;
  f.ctx.store.put = async (key, value) => {
    if (!failed && key === STATE + ':slot:2026-09-05T14' && value.plans?.[0]?.stage === 'delivered') {
      failed = true; throw Error('synthetic_write_failure');
    }
    return originalPut(key, value);
  };
  await assert.rejects(progress(f.ctx), /synthetic_write_failure/);
  await progress(f.ctx); assert.equal(f.posts.length, 1); assert.equal(f.acks.length, 1);
});
test('same observation with changed metric, future date or duplicate campaign fails before delivery', async t => {
  const f = await fixture(t); await progress(f.ctx);
  const observed = f.rows[0].lastSyncedAt; f.advance(14, 80); f.rows[0].lastSyncedAt = observed;
  await assert.rejects(progress(f.ctx), /metric_changed_without_observation/);
  f.rows[0].lastSyncedAt = '2026-09-06T14:00:00.000Z';
  await assert.rejects(progress(f.ctx), /invalid_digest_metric/);
  f.rows = [row(1, 80, f.now), row(1, 80, f.now)];
  await assert.rejects(progress(f.ctx), /invalid_digest_identity/);
  assert.equal(f.posts.length, 0); assert.equal(f.acks.length, 0);
});
test('probe is read only and never initializes a baseline or posts sync', async t => {
  const f = await fixture(t, false);
  const result = await progress(f.ctx, { probe: true });
  assert.equal(result.probe, true); assert.equal(result.sends, 0);
  assert.equal(f.syncCalls, 0); assert.equal(await f.ctx.store.get(STATE), null);
});
test('explicit initialState is pure; a missing state blocks normal requests before network', async t => {
  const f = await fixture(t, false);
  assert.deepEqual(initialState(config), initialState(config));
  assert.equal(await f.ctx.store.get(STATE), null);
  await assert.rejects(progress(f.ctx), /state_missing/);
  assert.equal(f.routes.length, 0); assert.equal(f.posts.length, 0);
  await f.ctx.store.put(STATE, initialState(config));
  assert.equal((await progress(f.ctx)).baselineEstablished, 1);
});
test('Discord microsecond-offset receipt accepted; invalid/future timestamps cannot ACK', async t => {
  const f = await fixture(t); await progress(f.ctx); f.advance(14, 70);
  const realSend = f.ctx.sendOnce;
  let stamp = 'not-a-date';
  f.ctx.sendOnce = async (...args) => ({ ...await realSend(...args), timestamp: stamp });
  await assert.rejects(progress(f.ctx), /invalid_receipt/);
  stamp = '2026-09-05T15:00:00.000000+00:00';
  await assert.rejects(progress(f.ctx), /invalid_receipt/);
  assert.equal(f.acks.length, 0);
  stamp = '2026-09-05T14:00:00.000000+00:00';
  assert.equal((await progress(f.ctx)).acknowledgements, 1);
  assert.equal(f.posts.length, 1);
});
test('policy change and missing active job fail closed before a new effect', async t => {
  const f = await fixture(t); await progress(f.ctx);
  f.ctx.config.reactivationAfter = '2026-09-05T12:01:00.000Z';
  await assert.rejects(progress(f.ctx), /invalid_state/);
  f.ctx.config.reactivationAfter = config.reactivationAfter;
  const state = await f.ctx.store.get(STATE);
  await f.ctx.store.put(STATE, { ...state, activeSlot: '2026-09-05T14' });
  f.advance(14, 80); await assert.rejects(progress(f.ctx), /active_job_missing/);
  assert.equal(f.syncCalls, 1); assert.equal(f.posts.length, 0);
});
test('concurrent ticks serialize: one sync, one baseline and no duplicate progress alert', async t => {
  const f = await fixture(t); await progress(f.ctx); f.advance(14, 70);
  const results = await Promise.all([progress(f.ctx), progress(f.ctx), progress(f.ctx)]);
  assert.equal(results.filter(r => r.duplicate).length, 2);
  assert.equal(f.posts.length, 1); assert.equal(f.acks.length, 1); assert.equal(f.syncCalls, 2);
});
