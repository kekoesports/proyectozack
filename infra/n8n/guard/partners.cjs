'use strict';
const { hash } = require('./store.cjs');
const { loadRoutingPolicy, destination } = require('./routing.cjs');
const ROLLOUT_KEY = 'partners-rollout:v1';
const READ_PATH = '/api/automation/discord/partner-leads';
const PAGE_LIMIT = 25;
const fail = code => { throw Error('partner_' + code); };
function date(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString() !== value) fail('invalid_date');
  return Date.parse(value);
}
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exact(value, keys) {
  return object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
// Explicit operator installation ONLY after observing the current maximum batch ID.
// An empty table has ceiling 0. Never infer a replacement ceiling during normal polling.
function initialPartnerRollout(config, activatedAt, maxHistoricalBatchId) {
  if (!Number.isSafeInteger(maxHistoricalBatchId) || maxHistoricalBatchId < 0
    || !/^\d{17,20}$/.test(config.guildId) || !/^\d{17,20}$/.test(config.kpiChannelId)
    || date(activatedAt) < date(config.reactivationAfter)) fail('invalid_rollout');
  const policy = { version: 1, activatedAt, maxHistoricalBatchId,
    guildId: config.guildId, channelId: config.kpiChannelId, reactivationAfter: config.reactivationAfter };
  return { ...policy, hash: hash(JSON.stringify(policy)) };
}
async function rollout(ctx, now) {
  const row = await ctx.store.get(ROLLOUT_KEY);
  if (!exact(row, ['version', 'activatedAt', 'maxHistoricalBatchId', 'guildId', 'channelId', 'reactivationAfter', 'hash'])) {
    fail('rollout_missing_or_invalid');
  }
  const expected = initialPartnerRollout(ctx.config, row.activatedAt, row.maxHistoricalBatchId);
  if (Object.keys(expected).some(key => row[key] !== expected[key]) || date(row.activatedAt) > now) fail('rollout_policy_changed');
  return row;
}
function itemValid(item, config, routing) {
  if (!exact(item, ['batchId', 'guildId', 'channelId', 'message'])
    || !Number.isSafeInteger(item.batchId) || item.batchId < 1) fail('invalid_notification');
  const channels = routing && item.batchId <= routing.partnerMaxBatchId
    ? [config.kpiChannelId, destination(config, 'partner')]
    : [routing ? destination(config, 'partner') : config.kpiChannelId];
  if (item.guildId !== config.guildId || !channels.includes(item.channelId)) fail('destination_blocked');
  if (typeof item.message !== 'string' || !item.message.trim() || item.message.length > 1900) fail('invalid_message');
}
function receiptValid(receipt, ctx, installed, channelId) {
  const timestamp = receipt?.timestamp;
  const time = typeof timestamp === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)
    ? Date.parse(timestamp) : NaN;
  return object(receipt) && typeof receipt.id === 'string' && /^\d{17,20}$/.test(receipt.id)
    && receipt.channelId === channelId && typeof receipt.duplicate === 'boolean'
    && Number.isFinite(time) && time >= date(installed.activatedAt) && time <= date(ctx.now());
}
function fingerprint(item) {
  return hash(JSON.stringify({ batchId: item.batchId, guildId: item.guildId, channelId: item.channelId, message: item.message }));
}
function planValid(plan, item, installed, ctx) {
  if (plan === null || plan === undefined) return;
  if (!object(plan) || !['prepared', 'delivered', 'acknowledged'].includes(plan.state)
    || plan.batchId !== item.batchId || plan.fingerprint !== fingerprint(item)
    || plan.rolloutHash !== installed.hash || date(plan.preparedAt) < date(installed.activatedAt)
    || date(plan.preparedAt) > date(ctx.now())) fail('plan_conflict');
  if (plan.state !== 'prepared' && !receiptValid(plan.receipt, ctx, installed, item.channelId)) fail('invalid_receipt');
}
async function save(ctx, key, value) {
  await ctx.store.put(key, value);
  if (JSON.stringify(await ctx.store.get(key)) !== JSON.stringify(value)) fail('ledger_readback_failed');
}
const SAFE_ERRORS = new Set(['partner_plan_conflict', 'partner_invalid_receipt', 'partner_invalid_ack',
  'partner_ledger_readback_failed', 'partner_invalid_date', 'delivery_uncertain_requires_review',
  'delivery_payload_conflict', 'invalid_delivery_ledger', 'invalid_delivery_receipt',
  'discord_rate_limited', 'discord_invalid_receipt', 'durable_lock_busy_requires_review', 'ledger_readback_failed']);
function safeCode(error) {
  const code = error instanceof Error ? error.message : '';
  return SAFE_ERRORS.has(code) || /^crm_[1-5]\d{2}$/.test(code) ? code : 'partner_operation_failed';
}
async function partners(ctx, body = {}) {
  // Request body is only a wake-up. Research text and recipients come exclusively from CRM.
  if (!exact(body, [])) fail('invalid_body');
  return ctx.lock('partners', async () => {
    const startedAt = ctx.now(), start = date(startedAt), installed = await rollout(ctx, start);
    const routing = await loadRoutingPolicy(ctx);
    const response = await ctx.crm(READ_PATH);
    if (!object(response) || response.ok !== true || response.configured !== true
      || !Array.isArray(response.notifications) || response.notifications.length > PAGE_LIMIT) fail('invalid_notifications');
    const ids = new Set(), plans = new Map();
    // Validate the full page, destinations and existing fingerprints before any provider effect.
    for (const item of response.notifications) {
      itemValid(item, ctx.config, routing);
      if (ids.has(item.batchId)) fail('duplicate_page_identity');
      ids.add(item.batchId);
      if (item.batchId <= installed.maxHistoricalBatchId) continue;
      const key = 'partner-notification:' + item.batchId;
      const plan = await ctx.store.get(key);
      // CRM computes channelId from current env even for an old batch. Compare an
      // acknowledged historical plan with its original destination; never resend it.
      const beforeRouting = routing && item.batchId <= routing.partnerMaxBatchId;
      if (beforeRouting && plan?.state !== 'acknowledged') fail('pre_cutover_requires_review');
      planValid(plan, beforeRouting ? { ...item, channelId: ctx.config.kpiChannelId } : item, installed, ctx);
      plans.set(item.batchId, plan);
    }
    const summary = { ok: true, delivered: 0, duplicates: 0, acknowledged: 0,
      historicalSkipped: 0, deferred: 0, blocked: [], at: startedAt };
    for (let index = 0; index < response.notifications.length; index++) {
      const item = response.notifications[index];
      if (item.batchId <= installed.maxHistoricalBatchId) { summary.historicalSkipped++; continue; }
      if (date(ctx.now()) - start >= 90_000) { summary.deferred = response.notifications.length - index; summary.ok = false; break; }
      try {
        const key = 'partner-notification:' + item.batchId;
        let plan = plans.get(item.batchId);
        if (plan?.state === 'acknowledged') { summary.duplicates++; continue; }
        if (!plan) {
          plan = { state: 'prepared', batchId: item.batchId, fingerprint: fingerprint(item),
            rolloutHash: installed.hash, preparedAt: ctx.now() };
          await save(ctx, key, plan);
        }
        if (plan.state === 'prepared') {
          const receipt = await ctx.sendOnce('partner-radar:' + item.batchId, item.channelId, item.message);
          if (!receiptValid(receipt, ctx, installed, item.channelId)) fail('invalid_receipt');
          if (receipt.duplicate) summary.duplicates++; else summary.delivered++;
          plan = { ...plan, state: 'delivered', receipt };
          await save(ctx, key, plan); // Retain the real receipt BEFORE attempting CRM ACK.
        } else summary.duplicates++;
        // Current CRM contract accepts an empty body and stores a timestamp only.
        // Receipt identity lives in this durable guard plan; do not claim CRM stores it.
        const ack = await ctx.crm(READ_PATH + '/' + item.batchId + '/ack', { method: 'POST', body: {} });
        if (!exact(ack, ['ok', 'acknowledged']) || ack.ok !== true || typeof ack.acknowledged !== 'boolean') fail('invalid_ack');
        summary.acknowledged++;
        await save(ctx, key, { ...plan, state: 'acknowledged', acknowledgedAt: ctx.now() });
      } catch (error) {
        summary.ok = false; summary.blocked.push({ batchId: item.batchId, code: safeCode(error) });
        summary.deferred = response.notifications.length - index - 1; break;
      }
    }
    // The legacy endpoint has no cursor/since. A full historical page must be repaired explicitly.
    if (summary.historicalSkipped === PAGE_LIMIT) { summary.ok = false; summary.pageBlocked = 'partner_historical_page_limit'; }
    await save(ctx, 'status:partners', summary);
    return summary;
  });
}
module.exports = { partners, initialPartnerRollout, ROLLOUT_KEY };
