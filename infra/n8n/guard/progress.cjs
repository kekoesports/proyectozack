'use strict';
const { hash } = require('./store.cjs');
const STATE = 'progress-future:v1';
const LEVELS = [70, 80, 100];
// Source: automationDeals.syncAllAutomatedDeals, oldest successful sync first.
// Counts describe one batch, never the complete portfolio or a guaranteed 2h SLA.
const BATCH_MAX = 24;
const fail = code => { throw Error('progress_' + code); };
const integer = n => Number.isSafeInteger(n) && n >= 0;
const levelAt = pct => LEVELS.filter(level => pct >= level).at(-1) || 0;
function date(value) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) fail('invalid_date');
  return time;
}
function receiptValid(receipt, channelId, now) {
  // Discord emits microseconds and an explicit offset, unlike CRM Date.toISOString().
  const stamp = receipt?.timestamp;
  const time = typeof stamp === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(stamp)
    ? Date.parse(stamp) : NaN;
  return receipt && typeof receipt.id === 'string' && /^\d{17,20}$/.test(receipt.id)
    && receipt.channelId === channelId && Number.isFinite(time) && time <= date(now);
}
// Explicit first installation/authorized upgrade only; never called to repair
// missing durable state from a business request.
function initialState(config) {
  const cutoff = config.reactivationAfter; date(cutoff);
  if (!/^\d{17,20}$/.test(config.kpiChannelId)) fail('invalid_channel');
  const policy = hash(JSON.stringify({ cutoff, channelId: config.kpiChannelId, version: 1 }));
  return { version: 1, policy, baselines: {}, activeSlot: null, lastSlot: null };
}
async function save(ctx, key, value) {
  await ctx.store.put(key, value);
  if (JSON.stringify(await ctx.store.get(key)) !== JSON.stringify(value)) fail('ledger_readback_failed');
  return value;
}
function validateBaseline(row) {
  if (!row || !integer(row.progressPct) || row.progressPct > 100 || !integer(row.targetCount)
    || row.targetCount === 0 || !integer(row.currentCount) || typeof row.verified !== 'boolean'
    || ![0, ...LEVELS].includes(row.highWaterLevel) || typeof row.sourceHash !== 'string'
    || !/^[a-f0-9]{64}$/.test(row.sourceHash)) fail('invalid_baseline');
  date(row.observedAt); date(row.establishedAt);
}
function validateState(state, policy, now) {
  if (!state || state.version !== 1 || state.policy !== policy || !state.baselines
    || Array.isArray(state.baselines) || typeof state.baselines !== 'object'
    || !(state.activeSlot === null || /^\d{4}-\d{2}-\d{2}T\d{2}$/.test(state.activeSlot))
    || !(state.lastSlot === null || /^\d{4}-\d{2}-\d{2}T\d{2}$/.test(state.lastSlot))) fail('invalid_state');
  if (state.lastSlot && state.lastSlot > now.slice(0, 13)) fail('clock_regression');
  for (const [id, row] of Object.entries(state.baselines)) {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) fail('invalid_baseline_id');
    validateBaseline(row);
  }
}
function readDigest(value, now, startedAt) {
  if (value?.ok !== true || !Array.isArray(value.deals) || !integer(value.summary?.total)
    || value.summary.total !== value.deals.length || date(value.generatedAt) > date(now)
    || date(value.generatedAt) < date(startedAt)) fail('invalid_digest');
  const seen = new Set(), rows = [], unavailable = [];
  for (const row of value.deals) {
    if (!Number.isSafeInteger(row?.campaignId) || row.campaignId <= 0 || seen.has(row.campaignId)) fail('invalid_digest_identity');
    seen.add(row.campaignId);
    if (row.syncError !== null || !row.trackingSheetUrl || row.lastSyncedAt === null || row.targetCount === 0) {
      unavailable.push(row.campaignId); continue;
    }
    if (typeof row.trackingSheetUrl !== 'string' || !integer(row.targetCount) || !integer(row.currentCount)
      || !integer(row.progressPct) || row.progressPct > 100
      || row.progressPct !== Math.min(100, Math.round(row.currentCount / row.targetCount * 100))
      || date(row.lastSyncedAt) > date(value.generatedAt)) fail('invalid_digest_metric');
    rows.push({ campaignId: row.campaignId, progressPct: row.progressPct,
      currentCount: row.currentCount, targetCount: row.targetCount, observedAt: row.lastSyncedAt,
      sourceHash: hash(row.trackingSheetUrl) });
  }
  return { rows, unavailable: unavailable.length, total: value.deals.length,
    excludedOldCompleted: integer(value.summary.excludedOldCompleted) ? value.summary.excludedOldCompleted : null };
}
function planJob(state, job, digest, channelId, now) {
  const nextBaselines = structuredClone(state.baselines), plans = [];
  let established = 0, observedFreshInBatch = 0, unchanged = 0, provisional = 0;
  const partial = job.sync.failed > 0;
  // A partial batch may advance only independently healthy observations made
  // since this batch started. Failed/stale/unseen rows retain their last good state.
  const rows = partial ? digest.rows.filter(row => date(row.observedAt) >= date(job.startedAt)) : digest.rows;
  const present = new Set(rows.map(row => String(row.campaignId)));
  // Absence/invalidity never becomes zero. A returning row must establish a
  // fresh reference again; retain its high-water mark to avoid repeated milestones.
  for (const id of Object.keys(nextBaselines)) {
    if (!partial && !present.has(id)) nextBaselines[id].verified = false;
  }
  for (const row of rows) {
    const id = String(row.campaignId), prior = nextBaselines[id];
    const fresh = date(row.observedAt) >= date(job.startedAt);
    if (fresh) observedFreshInBatch++;
    if (prior && date(row.observedAt) < date(prior.observedAt)) fail('observation_regression');
    if (prior && row.observedAt === prior.observedAt && prior.targetCount === row.targetCount
      && prior.sourceHash === row.sourceHash) {
      if (prior.progressPct !== row.progressPct || prior.currentCount !== row.currentCount) fail('metric_changed_without_observation');
      unchanged++; continue;
    }
    const sameDefinition = prior && prior.targetCount === row.targetCount && prior.sourceHash === row.sourceHash;
    const comparable = sameDefinition && prior.verified && date(row.observedAt) > date(prior.establishedAt);
    const reached = levelAt(row.progressPct);
    const oldHigh = prior?.highWaterLevel || 0;
    if (comparable && reached > oldHigh && prior.progressPct < reached) {
      const message = '📈 HITO DE PROGRESO · Campaña #' + id + '\n'
        + 'Nuevo umbral: ' + reached + '% · Avance observado: ' + row.progressPct + '% ('
        + row.currentCount + '/' + row.targetCount + ').\n'
        + 'https://socialpro.es/admin/campanas/' + id
        + '\nAviso interno de seguimiento. No se ha creado ni enviado ninguna factura.';
      plans.push({ campaignId: row.campaignId, level: reached, channelId, message,
        key: STATE + ':campaign:' + id + ':level:' + reached, stage: 'planned', receipt: null });
    }
    const verified = Boolean(comparable || fresh);
    if (!prior || !comparable) established++;
    if (!verified) provisional++;
    nextBaselines[id] = { progressPct: row.progressPct, currentCount: row.currentCount,
      targetCount: row.targetCount, observedAt: row.observedAt, sourceHash: row.sourceHash,
      establishedAt: comparable ? prior.establishedAt : now, verified,
      highWaterLevel: Math.max(oldHigh, reached) };
  }
  return { ...job, stage: 'planned', nextBaselines, plans, coverage: {
    digestRows: digest.total, validObservedRows: digest.rows.length, unavailable: digest.unavailable,
    deferredNotFresh: digest.rows.length - rows.length,
    excludedOldCompleted: digest.excludedOldCompleted, observedFreshInBatch, baselineEstablished: established,
    provisional, unchanged, completePortfolioSync: false, batchMaximum: BATCH_MAX } };
}
function validateJob(job, slot, now) {
  if (!job || job.slot !== slot || !['sync_started', 'synced', 'planned', 'done', 'uncertain'].includes(job.stage)
    || date(job.startedAt) > date(now)) fail('invalid_job');
  if (job.stage === 'planned' || (job.stage === 'done' && job.nextBaselines)) {
    if (!Array.isArray(job.plans) || !job.nextBaselines || typeof job.nextBaselines !== 'object') fail('invalid_plan');
    for (const row of Object.values(job.nextBaselines)) validateBaseline(row);
    const unique = new Set();
    for (const plan of job.plans) {
      if (!Number.isSafeInteger(plan.campaignId) || plan.campaignId <= 0 || !LEVELS.includes(plan.level)
        || plan.key !== STATE + ':campaign:' + plan.campaignId + ':level:' + plan.level
        || unique.has(plan.key) || typeof plan.message !== 'string' || !plan.message || plan.message.length > 2000
        || !['planned', 'delivered', 'acked'].includes(plan.stage)) fail('invalid_plan');
      unique.add(plan.key);
    }
  }
}
async function deliver(ctx, key, job) {
  for (let index = 0; index < job.plans.length; index++) {
    let plan = job.plans[index];
    if (plan.channelId !== ctx.config.kpiChannelId) fail('destination_changed');
    if (plan.stage === 'planned') {
      const receipt = await ctx.sendOnce(plan.key, plan.channelId, plan.message);
      if (!receiptValid(receipt, plan.channelId, ctx.now())) fail('invalid_receipt');
      plan = { ...plan, stage: 'delivered', receipt };
      job.plans[index] = plan;
      await save(ctx, key, job); // before ACK; retries skip Discord entirely
    }
    if (!receiptValid(plan.receipt, plan.channelId, ctx.now())) fail('invalid_receipt');
    if (plan.stage === 'delivered') {
      // Existing CRM handler uses greatest(alertLevel, level): ACK retry is safe.
      const ack = await ctx.crm('/api/automation/deals/' + plan.campaignId + '/alerts/ack', {
        method: 'POST', body: { level: plan.level }
      });
      if (ack?.ok !== true || ack.progress?.campaignId !== plan.campaignId
        || !integer(ack.progress.alertLevel) || ack.progress.alertLevel < plan.level) fail('invalid_ack');
      job.plans[index] = { ...plan, stage: 'acked' };
      await save(ctx, key, job);
    }
  }
  return job;
}
async function finish(ctx, state, job) {
  await save(ctx, STATE, { ...state, baselines: job.nextBaselines || state.baselines,
    lastSlot: job.slot, activeSlot: null });
  await save(ctx, 'status:progress', job.result);
  return job.result;
}
async function progress(ctx, body = {}) {
  const now = ctx.now(); date(now);
  const cutoff = ctx.config.reactivationAfter; date(cutoff);
  if (date(now) < date(cutoff)) fail('before_reactivation');
  if (body.probe === true) {
    const digest = readDigest(await ctx.crm('/api/automation/deals/digest'), ctx.now(), now);
    return { ok: true, probe: true, crmRead: true, validObservedRows: digest.rows.length,
      unavailable: digest.unavailable, sends: 0, sensitiveBranchesRemoved: true, at: ctx.now() };
  }
  return ctx.lock('progress', async () => {
    const policy = initialState(ctx.config).policy;
    let state = await ctx.store.get(STATE);
    if (state === null || state === undefined) fail('state_missing');
    validateState(state, policy, ctx.now());
    const slot = state.activeSlot || ctx.now().slice(0, 13), key = STATE + ':slot:' + slot;
    let job = await ctx.store.get(key);
    if (state.activeSlot && !job) fail('active_job_missing');
    if (job) {
      validateJob(job, slot, ctx.now());
      if (job.stage === 'done') {
        if (state.activeSlot) return { ...await finish(ctx, state, job), resumed: true };
        await save(ctx, 'status:progress', job.result); // repair summary only; never reprocess a completed slot
        return { ...job.result, duplicate: true };
      }
      if (['sync_started', 'uncertain'].includes(job.stage)) fail('sync_uncertain_requires_review');
    } else {
      if (state.lastSlot === slot) fail('completed_job_missing');
      job = { slot, startedAt: ctx.now(), stage: 'sync_started' };
      await save(ctx, key, job);
      state = await save(ctx, STATE, { ...state, activeSlot: slot });
      let response;
      try { response = await ctx.crm('/api/automation/deals/sync', { method: 'POST', body: {} }); }
      catch { await save(ctx, key, { ...job, stage: 'uncertain' }); fail('sync_uncertain_requires_review'); }
      if (response?.ok !== true || ![response.total, response.synced, response.failed].every(integer)
        || response.synced + response.failed !== response.total || response.total > BATCH_MAX) {
        await save(ctx, key, { ...job, stage: 'uncertain' }); fail('invalid_sync_result');
      }
      job = await save(ctx, key, { ...job, stage: 'synced', sync: {
        total: response.total, synced: response.synced, failed: response.failed,
        historicalAlertsIgnored: Array.isArray(response.alerts) ? response.alerts.length : 0 } });
    }
    if (job.stage === 'synced') {
      const digest = readDigest(await ctx.crm('/api/automation/deals/digest'), ctx.now(), job.startedAt);
      job = await save(ctx, key, planJob(state, job, digest, ctx.config.kpiChannelId, ctx.now()));
    }
    job = await deliver(ctx, key, job);
    job = await save(ctx, key, { ...job, stage: 'done', result: { ok: job.sync.failed === 0, ...job.sync,
      ...job.coverage, alertsDelivered: job.plans.length, acknowledgements: job.plans.length,
      sensitiveBranchesRemoved: true, at: ctx.now() } });
    return finish(ctx, state, job);
  });
}
module.exports = { progress, initialState };
