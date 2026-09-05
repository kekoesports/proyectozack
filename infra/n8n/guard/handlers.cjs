'use strict';
const { hash } = require('./store.cjs');
const { progress } = require('./progress.cjs');
const stamp = (ctx) => ctx.now();
function split(content) {
  if (typeof content !== 'string') throw Error('invalid_message');
  const parts = [];
  while (content.length) { parts.push(content.slice(0, 1900)); content = content.slice(1900); }
  return parts;
}
async function deliverPlan(ctx, key, content, channelId) {
  let plan = await ctx.store.get('plan:' + key);
  if (!plan) {
    const parts = content.flatMap(split);
    if (!parts.length || parts.length > 30) throw Error('invalid_plan_size');
    plan = { parts, channelId, createdAt: stamp(ctx) };
    await ctx.store.put('plan:' + key, plan);
  }
  const receipts = [];
  for (let i = 0; i < plan.parts.length; i++) {
    receipts.push(await ctx.sendOnce(key + ':' + i, plan.channelId, plan.parts[i]));
  }
  return receipts;
}
async function e2e(ctx, body) {
  const id = body.testEventId;
  if (id !== ctx.config.testEventId || !/^SOCIALPRO_N8N_E2E_TEST_\d{8}T\d{6}Z$/.test(id)) throw Error('test_not_authorized');
  return ctx.lock('e2e', async () => {
    const existing = await ctx.store.get('e2e:' + id);
    if (existing?.result) return { ...existing.result, duplicate: true };
    let entry = existing;
    if (!entry) {
      entry = { id, receivedAt: stamp(ctx), payload: {
        source: 'api', externalId: id,
        rawText: '[TEST SocialPro Automation] Prueba interna técnica. NO aprobar. Sin campaña, importes, factura, contrato ni envío externo.',
        proposedDeal: { name: '[TEST SocialPro Automation] ' + id }
      } };
      await ctx.store.put('e2e:' + id, entry);
    }
    if (!entry.draftId) {
      const r = await ctx.crm('/api/automation/deal-drafts', { method: 'POST', body: entry.payload });
      if (!Number.isSafeInteger(r.draft?.id) || r.draft.status !== 'missing_info' || r.draft.campaignId !== null) throw Error('invalid_test_draft');
      entry = { ...entry, draftId: r.draft.id, crmCreated: r.draft.created, crmAt: stamp(ctx) };
      await ctx.store.put('e2e:' + id, entry);
    }
    if (ctx.config.testFailOnce && !entry.transientFaultAt) {
      await ctx.store.put('e2e:' + id, { ...entry, transientFaultAt: stamp(ctx) });
      throw Error('test_transient_before_delivery');
    }
    const verified = await ctx.crm('/api/automation/deal-drafts/' + entry.draftId);
    if (verified.draft?.externalId !== id || verified.draft.campaignId !== null) throw Error('test_readback_failed');
    const receipts = await deliverPlan(ctx, id, [
      '[TEST SocialPro Automation]\n✅ CRM → n8n → Discord\nEvento: ' + id
      + '\nBorrador técnico #' + entry.draftId + ' · NO aprobar; no es un trato real.'
      + '\nReintento controlado antes del envío. Replay del mismo ID: sin mensaje adicional.'
      + '\nSin facturas, pagos, contratos ni comunicaciones externas.'
    ], ctx.config.kpiChannelId);
    if (receipts.length !== 1) throw Error('test_message_count');
    const result = { ok: true, testEventId: id, draftId: entry.draftId, crmReadback: true,
      discord: receipts[0], processedAt: stamp(ctx), transientFaultAt: entry.transientFaultAt || null };
    await ctx.store.put('e2e:' + id, { ...entry, result });
    return result;
  });
}
async function notify(ctx, body = {}) {
  if (body.testEventId) return e2e(ctx, body);
  return ctx.lock('notify', async () => {
    const r = await ctx.crm('/api/automation/discord/deal-created');
    if (!Array.isArray(r.notifications)) throw Error('invalid_notifications');
    const summary = { ok: true, delivered: 0, historicalSkipped: 0, blocked: [], at: stamp(ctx) };
    for (const item of r.notifications) {
      try {
        if (!Number.isSafeInteger(item.draftId) || ![ctx.config.pipelineChannelId, ctx.config.kpiChannelId].includes(item.channelId)) throw Error('notification_destination_blocked');
        const detail = await ctx.crm('/api/automation/deal-drafts/' + item.draftId);
        const when = Date.parse(detail.draft?.reviewedAt);
        if (!Number.isFinite(when) || when > Date.parse(ctx.now())) throw Error('notification_date_missing');
        if (when < Date.parse(ctx.config.reactivationAfter)) { summary.historicalSkipped++; continue; }
        const key = 'deal-created:' + item.draftId;
        const receipts = await deliverPlan(ctx, key, [item.message], item.channelId);
        await ctx.crm('/api/automation/discord/deal-created/' + item.draftId + '/ack', { method: 'POST', body: {} });
        summary.delivered += receipts.filter(r => !r.duplicate).length;
      } catch (error) { summary.blocked.push({ draftId: item.draftId, code: safeCode(error) }); }
    }
    summary.ok = summary.blocked.length === 0;
    await ctx.store.put('status:notify', summary);
    return summary;
  });
}
async function digest(ctx, body = {}) {
  return ctx.lock('digest', async () => {
    const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', dateStyle: 'short' }).format(new Date(ctx.now()));
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }).format(new Date(ctx.now())));
    const r = await ctx.crm('/api/automation/deals/digest');
    if (!Array.isArray(r.discordMessages) || r.discordMessages.some(s => typeof s !== 'string')) throw Error('invalid_digest');
    if (body.probe === true) return { ok: true, probe: true, crmRead: true, messageParts: r.discordMessages.flatMap(split).length, sends: 0, at: stamp(ctx) };
    if (hour !== 10) return { ok: true, skipped: 'outside_10am_window', at: stamp(ctx) };
    const receipts = await deliverPlan(ctx, 'daily:' + local, r.discordMessages, ctx.config.kpiChannelId);
    const summary = { ok: true, day: local, delivered: receipts.filter(r => !r.duplicate).length, duplicates: receipts.filter(r => r.duplicate).length, at: stamp(ctx) };
    await ctx.store.put('status:digest', summary);
    return summary;
  });
}
async function intake(ctx, body) {
  if (body.testEventId) return e2e(ctx, body);
  if (typeof body.externalId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,159}$/.test(body.externalId)
    || typeof body.rawText !== 'string' || !body.rawText.trim() || body.rawText.length > 10000) throw Error('invalid_intake');
  const source = body.source || 'discord';
  // This restored intake accepts new internal Discord messages only. The
  // synthetic api fixture is separately allowlisted above; no historical import.
  if (source !== 'discord' || !/^\d{17,20}$/.test(body.externalId)) throw Error('intake_origin_gate');
  const sourceTime = Number((BigInt(body.externalId) >> 22n) + 1420070400000n);
  if (sourceTime <= Date.parse(ctx.config.reactivationAfter) || sourceTime > Date.parse(ctx.now())) throw Error('intake_historical_blocked');
  if (![ctx.config.pipelineChannelId, ctx.config.kpiChannelId].includes(body.sourceChannelId)) throw Error('intake_channel_blocked');
  return ctx.lock('intake:' + source + ':' + body.externalId, async () => {
    const key = 'intake:' + source + ':' + body.externalId, fingerprint = hash(JSON.stringify(body));
    let entry = await ctx.store.get(key);
    if (entry && entry.fingerprint !== fingerprint) throw Error('intake_payload_conflict');
    if (entry?.result) return { ...entry.result, duplicate: true };
    if (!entry) {
      entry = { fingerprint, receivedAt: stamp(ctx) };
      await ctx.store.put(key, entry);
    }
    const r = await ctx.crm('/api/automation/deal-drafts', { method: 'POST', body: {
      source, externalId: body.externalId, rawText: body.rawText,
      sourceChannelId: body.sourceChannelId, sourceUserId: body.sourceUserId,
      proposedDeal: body.proposedDeal ?? body.deal ?? {}
    } });
    if (!Number.isSafeInteger(r.draft?.id)) throw Error('invalid_intake_receipt');
    // Existing pre-restoration drafts are never replayed into Discord.
    const createdAt = Date.parse(r.draft.createdAt);
    if (!Number.isFinite(createdAt) || createdAt > Date.parse(ctx.now())) throw Error('intake_invalid_receipt_date');
    const historical = createdAt < Date.parse(ctx.config.reactivationAfter);
    const text = '📥 BORRADOR RECIBIDO #' + r.draft.id + '\n'
      + String(r.draft.proposedDeal?.name || 'Pendiente de completar').slice(0, 200)
      + '\nEstado: ' + r.draft.status + '\nFalta: ' + (r.draft.missingFields || []).join(', ')
      + '\nhttps://socialpro.es/admin/automation-drafts/' + r.draft.id;
    if (!historical) await deliverPlan(ctx, key, [text], ctx.config.kpiChannelId);
    const result = { ok: true, draftId: r.draft.id, draftStatus: r.draft.status, historicalSkipped: historical, at: stamp(ctx) };
    await ctx.store.put(key, { ...entry, result });
    return result;
  });
}
function safeCode(error) { return /^[a-z0-9_:]+$/.test(error.message) ? error.message : 'operation_failed'; }
module.exports = { notify, digest, intake, progress, e2e, deliverPlan, safeCode };
