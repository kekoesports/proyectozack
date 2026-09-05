'use strict';

const gates = require('./gates.cjs');

// ctx owns HTTP authentication/JSON boundaries and a single-process lock.
// Every put must be an atomic durable write; never run two service processes
// against this store. Delivery dedupe/uncertain outcomes belong to sendOnce and
// reactOnce. No native HTTP, model, timer, process.env or logging lives here.
const STAGES = ['prepared', 'crm_started', 'ready', 'confirmed', 'uncertain', 'failed'];
function fail(code) { throw new Error('poller:' + code); }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exact(value, names) {
  if (!record(value) || Object.keys(value).length !== names.length
    || names.some((name) => !Object.hasOwn(value, name))) fail('invalid_stored_record');
}
function id(value) {
  if (typeof value !== 'string' || !/^\d{17,20}$/.test(value)
    || BigInt(value) > 18446744073709551615n) fail('invalid_id');
  return value;
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function settings(ctx, mode) {
  return { mode, channelId: mode === 'pipeline' ? ctx.config.pipelineChannelId : ctx.config.kpiChannelId,
    reactivationAfter: ctx.config.reactivationAfter,
    allowedActorIds: mode === 'kpi' ? ctx.config.allowedActorIds : [], pageLimit: 100 };
}
function names(mode) {
  const prefix = 'poll-' + mode;
  return { checkpoint: prefix + '-checkpoint', pending: prefix + '-pending',
    message: (messageId) => prefix + '-message-' + id(messageId) };
}
async function save(ctx, key, value) {
  await ctx.store.put(key, value);
  const saved = await ctx.store.get(key);
  if (!same(value, saved)) fail('durable_write_not_verified');
  return saved;
}
function validResponse(mode, message, response) {
  if (mode === 'pipeline') return gates.validatePipelineResponse([message], response);
  if (!record(response) || response.ok !== true || response.partial === true
    || response.status === 'partial' || (Object.hasOwn(response, 'failed') && response.failed !== 0)
    || !Array.isArray(response.discordMessages) || response.discordMessages.length > 100
    || response.discordMessages.some((content) => typeof content !== 'string'
      || !content.trim() || content.length > 2000)) fail('kpi_invalid_response');
  return response;
}
function partsFor(job) {
  if (job.mode === 'pipeline') {
    const result = validResponse(job.mode, job.message, job.response);
    return result.reactions.map((reaction) => ({ kind: 'reaction', emoji: reaction.emoji }));
  }
  validResponse(job.mode, job.message, job.response);
  if (job.command.command === 'help') return [{ kind: 'reply', content: gates.HELP_TEXT }];
  if (job.command.command === 'detail' && job.command.query === '') {
    return [{ kind: 'reply', content: 'Indica qué trato buscas: zack detalle <creador, marca o trato>.' }];
  }
  if (job.response.discordMessages.length === 0) fail('kpi_empty_response');
  return job.response.discordMessages.map((content) => ({ kind: 'reply', content }));
}
function verifyJob(job, config, now) {
  exact(job, ['version', 'mode', 'channelId', 'reactivationAfter', 'sourceMessageId',
    'message', 'command', 'stage', 'response', 'parts', 'receipts']);
  if (job.version !== 1 || job.mode !== config.mode || job.channelId !== config.channelId
    || job.reactivationAfter !== config.reactivationAfter || !STAGES.includes(job.stage)) fail('job_policy_mismatch');
  id(job.sourceMessageId);
  exact(job.message, ['messageId', 'channelId', 'authorId', 'content']);
  if (job.message.messageId !== job.sourceMessageId) fail('job_identity_mismatch');
  const input = { id: job.sourceMessageId, channel_id: job.message.channelId,
    author: { id: job.message.authorId, bot: false }, content: job.message.content };
  const selected = gates.selectMessages([input], config, gates.createCheckpoint(config, null), now);
  if (selected.messages.length !== 1 || !same(selected.messages[0], job.message)) fail('job_invalid_message');
  if (config.mode === 'kpi') {
    exact(job.command, ['command', 'query']);
    const expected = selected.commands[0];
    if (!expected || job.command.command !== expected.command || job.command.query !== expected.query) fail('job_command_mismatch');
    gates.kpiRequest(job.command.command, job.command.query);
  } else if (job.command !== null) fail('job_command_mismatch');
  if (!Array.isArray(job.receipts)) fail('job_invalid_receipts');
  if (['prepared', 'crm_started'].includes(job.stage)) {
    if (job.response !== null || job.parts !== null || job.receipts.length !== 0) fail('job_invalid_stage');
  }
  if (['ready', 'confirmed'].includes(job.stage)) {
    const expectedParts = partsFor(job);
    if (!same(job.parts, expectedParts) || job.receipts.length > expectedParts.length) fail('job_invalid_parts');
    for (let index = 0; index < job.receipts.length; index += 1) {
      const receipt = job.receipts[index];
      if (job.mode === 'kpi') {
        exact(receipt, ['id', 'channelId']);
        id(receipt.id);
        if (receipt.channelId !== job.channelId) fail('receipt_channel_mismatch');
      } else {
        exact(receipt, ['httpStatus']);
        if (receipt.httpStatus !== 204) fail('reaction_not_confirmed');
      }
    }
    if (job.stage === 'confirmed' && job.receipts.length !== expectedParts.length) fail('job_unconfirmed_parts');
  }
  return job;
}
function newJob(config, message, command) {
  return { version: 1, mode: config.mode, channelId: config.channelId,
    reactivationAfter: config.reactivationAfter, sourceMessageId: message.messageId,
    message: copy(message), command: command ? { command: command.command, query: command.query } : null,
    stage: 'prepared', response: null, parts: null, receipts: [] };
}
function consumedResponse(job, response) {
  validResponse(job.mode, job.message, response);
  if (job.mode === 'kpi') return { ok: true, discordMessages: [...response.discordMessages] };
  return { ok: true, summary: Object.fromEntries(
    ['received', 'created', 'alreadySeen', 'ignored', 'failed', 'draftsCreated', 'draftsAlreadySeen']
      .map((key) => [key, response.summary[key]])),
  outcomes: response.outcomes.map((outcome) => ({
    messageId: outcome.messageId, result: outcome.result,
    ...(outcome.status === undefined ? {} : { status: outcome.status }),
    ...(outcome.draftId === undefined ? {} : { draftId: outcome.draftId }),
  })) };
}
async function executeJob(ctx, config, key, initial) {
  let job = verifyJob(initial, config, ctx.now());
  if (['uncertain', 'failed'].includes(job.stage)
    || (job.stage === 'crm_started' && job.mode === 'pipeline')) fail('job_requires_review');
  if (job.stage === 'confirmed') return job;
  if (job.stage === 'prepared' || job.stage === 'crm_started') {
    // A read may be retried before any response/send is persisted. A POST whose
    // acceptance is unknown must never be retried automatically.
    job = await save(ctx, key, { ...job, stage: 'crm_started' });
    let response;
    try {
      response = job.mode === 'pipeline'
        ? await ctx.crm('/api/automation/discord/pipeline-deals',
          { method: 'POST', body: { messages: [job.message] } })
        : await ctx.crm(gates.kpiRequest(job.command.command, job.command.query).path, { method: 'GET' });
    } catch {
      await save(ctx, key, { ...job, stage: job.mode === 'pipeline' ? 'uncertain' : 'prepared' });
      fail(job.mode === 'pipeline' ? 'crm_acceptance_uncertain' : 'crm_read_failed');
    }
    let ready;
    try {
      const responseCache = consumedResponse(job, response);
      ready = { ...job, stage: 'ready', response: responseCache };
      ready.parts = partsFor(ready);
    } catch {
      // Never return success for HTTP200 partial, missing outcomes or bad parts.
      await save(ctx, key, { ...job, stage: 'failed' });
      fail('crm_response_invalid_or_unpersisted');
    }
    job = await save(ctx, key, ready);
  }
  for (let part = job.receipts.length; part < job.parts.length; part += 1) {
    const effectKey = 'poll-' + job.mode + '-' + job.channelId + '-' + job.sourceMessageId + '-v1-' + part;
    const item = job.parts[part];
    let receipt;
    try {
      if (item.kind === 'reply') {
        const result = await ctx.sendOnce(effectKey, job.channelId, item.content);
        if (!record(result) || result.channelId !== job.channelId
          || typeof result.duplicate !== 'boolean') fail('invalid_send_receipt');
        id(result.id);
        receipt = { id: result.id, channelId: result.channelId };
      } else {
        const result = await ctx.reactOnce(effectKey, job.channelId, job.sourceMessageId, item.emoji);
        if (!record(result) || result.httpStatus !== 204) fail('reaction_not_confirmed');
        receipt = { httpStatus: 204 };
      }
    } catch {
      await save(ctx, key, { ...job, stage: 'uncertain' });
      fail('discord_delivery_uncertain');
    }
    // A write failure here leaves ready/cached parts. sendOnce/reactOnce must
    // recover their confirmed ledger receipt without a second external effect.
    job = await save(ctx, key, { ...job, receipts: [...job.receipts, receipt] });
  }
  return save(ctx, key, { ...job, stage: 'confirmed' });
}
async function finishPending(ctx, config, storage, previous, sourceMessageId) {
  const key = storage.message(sourceMessageId);
  const saved = await ctx.store.get(key);
  if (saved === undefined || saved === null) fail('pending_job_missing');
  verifyJob(saved, config, ctx.now());
  if (saved.sourceMessageId !== sourceMessageId) fail('pending_identity_conflict');
  if (previous.cursor !== null && BigInt(previous.cursor) >= BigInt(sourceMessageId)) {
    if (previous.cursor !== sourceMessageId || saved.stage !== 'confirmed') fail('pending_cursor_conflict');
    await save(ctx, storage.pending, null);
    return previous;
  }
  const job = await executeJob(ctx, config, key, saved);
  let current = previous;
  if (previous.cursor !== sourceMessageId) {
    const one = { checkpointRevision: previous.revision, previousCursor: previous.cursor,
      candidateCursor: sourceMessageId, messages: [job.message] };
    const next = gates.advanceCheckpoint(previous, one, [sourceMessageId]);
    current = await save(ctx, storage.checkpoint, next);
    gates.assertPersistedTransition(previous, next, current);
  }
  await save(ctx, storage.pending, null);
  return current;
}
async function poll(ctx, mode) {
  const config = settings(ctx, mode);
  const storage = names(mode);
  const now = ctx.now();
  let current = await ctx.store.get(storage.checkpoint);
  // Only the explicit first-install initializer may create this checkpoint.
  // Missing durable state after operation must not reset cursor to T0.
  if (current === undefined || current === null) fail('checkpoint_missing');
  gates.selectMessages([], config, current, now); // validate policy before any HTTP
  let resumed = 0;
  const pending = await ctx.store.get(storage.pending);
  if (pending !== undefined && pending !== null) {
    id(pending);
    current = await finishPending(ctx, config, storage, current, pending);
    resumed = 1;
  }
  const messages = await ctx.discordMessages(config.channelId, { limit: 100 });
  const selected = gates.selectMessages(messages, config, current, ctx.now());
  let processed = 0;
  for (const message of selected.messages) {
    const key = storage.message(message.messageId);
    const command = selected.commands.find((entry) => entry.sourceMessageId === message.messageId);
    const planned = newJob(config, message, command);
    let job = await ctx.store.get(key);
    if (job === undefined || job === null) job = await save(ctx, key, planned);
    else {
      verifyJob(job, config, ctx.now());
      if (!same(job.message, planned.message) || !same(job.command, planned.command)) fail('message_plan_conflict');
    }
    // Pointer is durable before any CRM effect, so an interrupted operation
    // resumes its frozen plan even if its source no longer fits the latest page.
    await save(ctx, storage.pending, message.messageId);
    current = await finishPending(ctx, config, storage, current, message.messageId);
    processed += 1;
  }
  if (selected.candidateCursor !== current.cursor) {
    // All eligible messages are confirmed. Only filtered/no-effect messages
    // remain between current and the last observed ID.
    const noEffects = { checkpointRevision: current.revision, previousCursor: current.cursor,
      candidateCursor: selected.candidateCursor, messages: [] };
    const next = gates.advanceCheckpoint(current, noEffects, []);
    const observed = await save(ctx, storage.checkpoint, next);
    gates.assertPersistedTransition(current, next, observed);
  }
  return { ok: true, mode, processed, resumed, inspected: selected.stats.input,
    financialBlocked: selected.stats.financialBlocked,
    unauthorized: selected.stats.unauthorized, noNewMessages: selected.messages.length === 0 };
}
async function safePoll(ctx, mode) {
  try { return await ctx.lock('poll-' + mode, () => poll(ctx, mode)); }
  catch (error) {
    // Fixed codes only. Provider body, message text, IDs and query never escape.
    const message = error instanceof Error ? error.message : '';
    if (/^(?:poller|restoration_gate):[a-z_]{1,64}$/.test(message)) throw error;
    fail('operation_failed');
  }
}
module.exports = { pollPipeline: (ctx) => safePoll(ctx, 'pipeline'),
  pollKpi: (ctx) => safePoll(ctx, 'kpi') };
