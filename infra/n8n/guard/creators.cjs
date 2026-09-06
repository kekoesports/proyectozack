'use strict';
const { hash } = require('./store.cjs');
const { loadRoutingPolicy, destination } = require('./routing.cjs');
const EVENT_KEY = /^creator-(run|status|test):[A-Za-z0-9:_-]{1,80}$/;
const SNOWFLAKE = /^\d{17,20}$/;
function date(value) {
  if (typeof value !== 'string') throw Error('creator_invalid_date');
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw Error('creator_invalid_date');
  return parsed;
}
function itemValid(item, config, now, routing) {
  const keys = ['id', 'eventKey', 'createdAt', 'guildId', 'channelId', 'message'];
  if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).length !== keys.length
    || keys.some(key => !Object.hasOwn(item, key)) || !Number.isSafeInteger(item.id) || item.id < 1
    || typeof item.eventKey !== 'string' || !EVENT_KEY.test(item.eventKey)) throw Error('creator_invalid_notification');
  const channelId = routing && item.id > routing.creatorMaxOutboxId ? destination(config, 'creator') : config.kpiChannelId;
  if (item.guildId !== config.guildId || item.channelId !== channelId) throw Error('creator_destination_blocked');
  if (typeof item.message !== 'string' || !item.message.trim() || item.message.length > 1800) throw Error('creator_invalid_message');
  const created = date(item.createdAt);
  if (created > now) throw Error('creator_future_notification');
  if (routing && item.id > routing.creatorMaxOutboxId && created < date(routing.activatedAt)) throw Error('creator_pre_cutover_requires_review');
  return created;
}
function safeCode(error) {
  return error instanceof Error && /^[a-z0-9_:]{1,100}$/.test(error.message) ? error.message : 'creator_operation_failed';
}
function receiptValid(receipt, ctx, channelId) {
  return receipt && typeof receipt.id === 'string' && SNOWFLAKE.test(receipt.id)
    && receipt.channelId === channelId && typeof receipt.timestamp === 'string'
    && Number.isFinite(Date.parse(receipt.timestamp)) && Date.parse(receipt.timestamp) <= date(ctx.now())
    && typeof receipt.duplicate === 'boolean';
}
async function creators(ctx, body = {}) {
  // The request is only a wake-up. Messages and destinations must come from the authenticated CRM outbox.
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) throw Error('creator_invalid_body');
  return ctx.lock('creators', async () => {
    const startedAt = ctx.now(), start = date(startedAt), cutoff = date(ctx.config.reactivationAfter);
    if (cutoff > start) throw Error('creator_invalid_cutoff');
    const routing = await loadRoutingPolicy(ctx);
    const response = await ctx.crm('/api/automation/discord/creator-discovery?since=' + encodeURIComponent(ctx.config.reactivationAfter));
    if (!response || response.ok !== true || !Array.isArray(response.notifications) || response.notifications.length > 20) {
      throw Error('creator_invalid_notifications');
    }
    // Validate the complete bounded page and identity conflicts before the first effect.
    const ids = new Set(), keys = new Set();
    for (const item of response.notifications) {
      itemValid(item, ctx.config, date(ctx.now()), routing);
      if (ids.has(item.id) || keys.has(item.eventKey)) throw Error('creator_duplicate_page_identity');
      ids.add(item.id); keys.add(item.eventKey);
      if (routing && item.id <= routing.creatorMaxOutboxId && date(item.createdAt) >= cutoff) {
        const old = await ctx.store.get('creator-notification:' + item.eventKey);
        const fingerprint = hash(JSON.stringify({ id: item.id, eventKey: item.eventKey, createdAt: item.createdAt,
          guildId: item.guildId, channelId: item.channelId, message: item.message }));
        if (old?.state !== 'acknowledged' || old.id !== item.id || old.fingerprint !== fingerprint
          || !receiptValid(old.receipt, ctx, item.channelId)) throw Error('creator_pre_cutover_requires_review');
      }
    }
    const summary = { ok: true, delivered: 0, duplicates: 0, acknowledged: 0, historicalSkipped: 0, deferred: 0, blocked: [], at: startedAt };
    for (let index = 0; index < response.notifications.length; index++) {
      const item = response.notifications[index];
      if (date(item.createdAt) < cutoff) { summary.historicalSkipped++; continue; }
      if (date(ctx.now()) - start >= 90_000) { summary.deferred = response.notifications.length - index; summary.ok = false; break; }
      try {
        const fingerprint = hash(JSON.stringify({ id: item.id, eventKey: item.eventKey, createdAt: item.createdAt,
          guildId: item.guildId, channelId: item.channelId, message: item.message }));
        const planKey = 'creator-notification:' + item.eventKey;
        let plan = await ctx.store.get(planKey);
        if (plan !== null && plan !== undefined && (!plan || typeof plan !== 'object'
          || !['prepared', 'acknowledged'].includes(plan.state) || plan.fingerprint !== fingerprint || plan.id !== item.id)) {
          throw Error('creator_plan_conflict');
        }
        if (plan?.state === 'acknowledged') {
          if (!receiptValid(plan.receipt, ctx, item.channelId)) throw Error('creator_invalid_receipt');
          summary.duplicates++; continue;
        }
        if (!plan) {
          plan = { state: 'prepared', id: item.id, fingerprint, preparedAt: ctx.now() };
          await ctx.store.put(planKey, plan);
        }
        const receipt = await ctx.sendOnce('creator-discovery:' + item.eventKey, item.channelId, item.message);
        if (!receiptValid(receipt, ctx, item.channelId)) throw Error('creator_invalid_receipt');
        if (receipt.duplicate) summary.duplicates++; else summary.delivered++;
        const ack = await ctx.crm('/api/automation/discord/creator-discovery/' + item.id + '/ack', {
          method: 'POST', body: { messageId: receipt.id, channelId: receipt.channelId },
        });
        if (!ack || ack.ok !== true || !['acknowledged', 'duplicate'].includes(ack.result)) throw Error('creator_invalid_ack');
        summary.acknowledged++;
        await ctx.store.put(planKey, { ...plan, state: 'acknowledged', receipt, acknowledgedAt: ctx.now() });
      } catch (error) {
        summary.blocked.push({ id: item.id, code: safeCode(error) });
        summary.ok = false;
        // A failed/uncertain effect remains recoverable under the same delivery key; no immediate retry.
        summary.deferred = response.notifications.length - index - 1;
        break;
      }
    }
    await ctx.store.put('status:creators', summary);
    return summary;
  });
}
module.exports = { creators };
