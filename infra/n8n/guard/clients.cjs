'use strict';
const { hash } = require('./store.cjs');
function makeClients(config, store, request = fetch) {
  const now = () => new Date().toISOString();
  const channels = new Set([config.pipelineChannelId, config.kpiChannelId]);
  function channel(id) { if (!channels.has(id)) throw Error('channel_not_allowed'); }
  async function discord(path, method = 'GET', body) {
    const response = await request('https://discord.com/api/v10' + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Bot ' + config.discordToken, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return response;
  }
  async function discordMessages(id, { limit = 100 } = {}) {
    channel(id);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw Error('invalid_limit');
    const r = await discord('/channels/' + id + '/messages?limit=' + limit);
    if (!r.ok) throw Error('discord_read_' + r.status);
    const rows = await r.json();
    if (!Array.isArray(rows)) throw Error('discord_invalid_page');
    return rows;
  }
  async function crm(path, options = {}) {
    const method = options.method || 'GET';
    const reads = /^\/api\/automation\/(?:deals\/digest(?:\?q=[^#]*)?|discord\/(?:deal-created|creator-discovery)|deal-drafts\/[1-9]\d*)$/;
    const creatorRead = /^\/api\/automation\/discord\/creator-discovery\?since=\d{4}-\d{2}-\d{2}T\d{2}%3A\d{2}%3A\d{2}\.\d{3}Z$/.test(path)
      && path === '/api/automation/discord/creator-discovery?since=' + encodeURIComponent(config.reactivationAfter);
    const writes = /^\/api\/automation\/(?:deal-drafts|discord\/pipeline-deals|discord\/deal-created\/[1-9]\d*\/ack|deals\/sync)$/;
    const alertAck = /^\/api\/automation\/deals\/[1-9]\d*\/alerts\/ack$/.test(path);
    const creatorAck = /^\/api\/automation\/discord\/creator-discovery\/[1-9]\d*\/ack$/.test(path);
    if (creatorAck && (!options.body || Object.keys(options.body).length !== 2
      || !Object.hasOwn(options.body, 'messageId') || !Object.hasOwn(options.body, 'channelId')
      || typeof options.body.messageId !== 'string' || !/^\d{17,20}$/.test(options.body.messageId)
      || options.body.channelId !== config.kpiChannelId)) throw Error('invalid_creator_ack');
    if (alertAck && (!options.body || Object.keys(options.body).length !== 1
      || ![70, 80, 100].includes(options.body.level))) throw Error('invalid_alert_ack');
    if (!((method === 'GET' && (reads.test(path) || creatorRead)) || (method === 'POST' && (writes.test(path) || alertAck || creatorAck)))) {
      throw Error('crm_effect_not_allowed');
    }
    const r = await request('https://socialpro.es' + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(path.endsWith('/sync') ? 150000 : 25000),
      headers: { Authorization: 'Bearer ' + config.crmToken, 'Content-Type': 'application/json' },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    const value = await r.json().catch(() => null);
    if (!r.ok || !value || value.ok !== true) throw Error('crm_' + r.status);
    return value;
  }
  async function sendOnce(key, id, content) {
    channel(id);
    if (typeof content !== 'string' || !content.trim() || content.length > 2000) throw Error('invalid_discord_content');
    return store.lock('delivery:' + key, async () => {
      const recordKey = 'delivery:' + key;
      let row = await store.get(recordKey);
      const fingerprint = hash(JSON.stringify({ id, content }));
      const receiptValid = r => r && typeof r.id === 'string' && /^\d{17,20}$/.test(r.id)
        && r.channelId === id && typeof r.timestamp === 'string' && Number.isFinite(Date.parse(r.timestamp));
      if (row !== null && row !== undefined && (!['sent', 'sending', 'uncertain', 'retryable'].includes(row.state)
        || typeof row.fingerprint !== 'string')) throw Error('invalid_delivery_ledger');
      if (row && row.fingerprint !== fingerprint) throw Error('delivery_payload_conflict');
      if (row?.state === 'sent') {
        if (!receiptValid(row.receipt)) throw Error('invalid_delivery_receipt');
        return { ...row.receipt, duplicate: true };
      }
      const nonce = hash(key).slice(0, 24);
      if (row && ['sending', 'uncertain'].includes(row.state)) {
        // Never blindly POST again after an unknown send. Recover only a receipt
        // proven by bot identity + nonce + same destination. Otherwise stop item.
        const recent = await discordMessages(id);
        const found = recent.find(m => m.author?.id === config.botId && String(m.nonce) === nonce
          && m.content === content && receiptValid({ id: m.id, channelId: m.channel_id, timestamp: m.timestamp }));
        if (!found) throw Error('delivery_uncertain_requires_review');
        const receipt = { id: found.id, channelId: id, timestamp: found.timestamp };
        await store.put(recordKey, { ...row, state: 'sent', receipt, recoveredAt: now() });
        return { ...receipt, duplicate: true };
      }
      row = { state: 'sending', fingerprint, nonce, startedAt: now(), channelId: id };
      await store.put(recordKey, row); // fsync claim BEFORE provider effect
      let response;
      try {
        response = await discord('/channels/' + id + '/messages', 'POST', {
          content, allowed_mentions: { parse: [] }, nonce, enforce_nonce: true
        });
      } catch {
        await store.put(recordKey, { ...row, state: 'uncertain', failedAt: now() });
        throw Error('delivery_uncertain_requires_review');
      }
      if (!response.ok) {
        const retryable = response.status === 429;
        await store.put(recordKey, { ...row, state: retryable ? 'retryable' : 'uncertain',
          httpStatus: response.status, failedAt: now() });
        throw Error(retryable ? 'discord_rate_limited' : 'delivery_uncertain_requires_review');
      }
      const data = await response.json().catch(() => null);
      if (!data || !receiptValid({ id: data.id, channelId: data.channel_id, timestamp: data.timestamp })) {
        await store.put(recordKey, { ...row, state: 'uncertain' });
        throw Error('discord_invalid_receipt');
      }
      const receipt = { id: data.id, channelId: id, timestamp: data.timestamp };
      await store.put(recordKey, { ...row, state: 'sent', receipt, completedAt: now() });
      return { ...receipt, duplicate: false };
    });
  }
  async function reactOnce(key, id, messageId, emoji) {
    channel(id);
    if (typeof messageId !== 'string' || !/^\d{17,20}$/.test(messageId) || !['⚠️', '👀', '✅', '🚫'].includes(emoji)) {
      throw Error('invalid_reaction');
    }
    return store.lock('reaction:' + key, async () => {
      const recordKey = 'reaction:' + key, fingerprint = hash(JSON.stringify({ id, messageId, emoji }));
      const row = await store.get(recordKey);
      if (row !== null && row !== undefined && (!['sent', 'sending'].includes(row.state) || typeof row.fingerprint !== 'string')) {
        throw Error('invalid_reaction_ledger');
      }
      if (row && row.fingerprint !== fingerprint) throw Error('reaction_payload_conflict');
      if (row?.state === 'sent') {
        if (typeof row.completedAt !== 'string' || !Number.isFinite(Date.parse(row.completedAt))) {
          throw Error('invalid_reaction_receipt');
        }
        return { httpStatus: 204, duplicate: true };
      }
      await store.put(recordKey, { state: 'sending', fingerprint, startedAt: now() });
      // Discord PUT own reaction is idempotent. Retrying sets the same reaction.
      const r = await discord('/channels/' + id + '/messages/' + messageId + '/reactions/' + encodeURIComponent(emoji) + '/@me', 'PUT');
      if (r.status !== 204) throw Error('reaction_' + r.status);
      await store.put(recordKey, { state: 'sent', fingerprint, completedAt: now() });
      return { httpStatus: 204, duplicate: false };
    });
  }
  return { crm, discordMessages, sendOnce, reactOnce, now };
}
module.exports = { makeClients };
