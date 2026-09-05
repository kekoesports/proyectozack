'use strict';

// Pure guard helpers; no I/O, timers, network, environment, secrets or logging.
// Integration: load checkpoint -> select -> fixed CRM request -> validate outcome.
// Persist each next checkpoint with compare-and-swap on revision, read back, then
// run the next external effect. beginDelivery must be durably committed BEFORE
// Discord send; completeDelivery only after a verified provider receipt.
// A started/uncertain delivery blocks later scans. Never rerun the send node or
// whole execution on unknown outcome. Human reconciliation is a separate action.
// n8n staticData alone is NOT a durable pre-send claim and has no cross-run CAS.
// These pure transitions do not implement persistence, locks or exactly-once.
// Initial activation must preserve a known old cursor and fix T0 once. Missing,
// invalid or changed policy/checkpoint fails closed, never reset to "now".
// For Code injection use this source without the final CommonJS export.

const EPOCH = 1420070400000n;
const MODES = ['pipeline', 'kpi'];
const HELP_TEXT = 'ZACK · KPI REPORTING\nzack revisa — consulta el informe actual\n'
  + 'zack detalle <creador, marca o trato> — consulta información concreta\n'
  + 'zack ayuda — muestra estos comandos\nFacturación desactivada en este canal.';

function fail(code) { throw new Error('restoration_gate:' + code); }
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function keys(value, expected) {
  if (!record(value) || Object.keys(value).some((key) => !expected.includes(key))
    || expected.some((key) => !Object.hasOwn(value, key))) fail('invalid_shape');
}
function snowflake(value) {
  if (typeof value !== 'string' || !/^\d{17,20}$/.test(value)
    || BigInt(value) > 18446744073709551615n) fail('invalid_id');
  return value;
}
function dateMillis(value) {
  if (typeof value !== 'string') fail('invalid_date');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) fail('invalid_date');
  return date.getTime();
}
function integer(value, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail('invalid_integer');
  return value;
}
function after(left, right) { return right === null || BigInt(left) > BigInt(right); }
function messageMillis(id) { return Number((BigInt(snowflake(id)) >> 22n) + EPOCH); }
function copy(value) { return JSON.parse(JSON.stringify(value)); }

function policy(input) {
  keys(input, ['mode', 'channelId', 'reactivationAfter', 'allowedActorIds', 'pageLimit']);
  if (!MODES.includes(input.mode)) fail('invalid_mode');
  snowflake(input.channelId);
  dateMillis(input.reactivationAfter);
  integer(input.pageLimit, 1, 100);
  if (!Array.isArray(input.allowedActorIds)) fail('invalid_allowlist');
  input.allowedActorIds.forEach(snowflake);
  if (new Set(input.allowedActorIds).size !== input.allowedActorIds.length
    || (input.mode === 'kpi' && input.allowedActorIds.length === 0)) fail('invalid_allowlist');
  return { mode: input.mode, channelId: input.channelId,
    reactivationAfter: input.reactivationAfter,
    allowedActorIds: [...input.allowedActorIds].sort(), pageLimit: input.pageLimit };
}

function checkpoint(value) {
  keys(value, ['version', 'policy', 'revision', 'cursor', 'deliveries']);
  if (value.version !== 1) fail('invalid_version');
  policy(value.policy);
  integer(value.revision, 0, Number.MAX_SAFE_INTEGER - 1);
  if (value.cursor !== null) snowflake(value.cursor);
  if (!Array.isArray(value.deliveries) || value.deliveries.length > 100) fail('invalid_ledger');
  const unique = new Set();
  for (const delivery of value.deliveries) {
    keys(delivery, ['sourceMessageId', 'part', 'kind', 'state', 'receiptId']);
    snowflake(delivery.sourceMessageId);
    integer(delivery.part, 0, 99);
    if (!['reply', 'reaction'].includes(delivery.kind)
      || !['started', 'confirmed', 'uncertain'].includes(delivery.state)) fail('invalid_delivery');
    if (delivery.receiptId !== null) snowflake(delivery.receiptId);
    if (delivery.state !== 'confirmed' && delivery.receiptId !== null) fail('invalid_receipt');
    if (delivery.state === 'confirmed' && delivery.kind === 'reply' && delivery.receiptId === null) fail('invalid_receipt');
    if ((value.policy.mode === 'kpi') !== (delivery.kind === 'reply')) fail('delivery_mode_mismatch');
    const key = deliveryKey(delivery);
    if (unique.has(key)) fail('duplicate_delivery');
    unique.add(key);
  }
  return value;
}
function createCheckpoint(config, preservedCursor) {
  if (preservedCursor !== null) snowflake(preservedCursor);
  return { version: 1, policy: policy(config), revision: 0,
    cursor: preservedCursor, deliveries: [] };
}
function normalizeCommand(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/\s+/g, ' ');
}
function hasControlCharacter(value) {
  return [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}
function classifyKpi(content) {
  if (typeof content !== 'string' || content.length > 4000
    || hasControlCharacter(content)) return { kind: 'ignored' };
  const normalized = normalizeCommand(content);
  if (['ok', 'zack ok', 'ok facturar', 'zack facturar', 'zack crea las facturas']
    .includes(normalized)) return { kind: 'financial_blocked' };
  if (['zack revisa', 'zack revisa de nuevo', 'revisa de nuevo'].includes(normalized)) {
    return { kind: 'read', command: 'review', query: '' };
  }
  if (['zack ayuda', 'ayuda zack'].includes(normalized)) {
    return { kind: 'read', command: 'help', query: '' };
  }
  const match = content.trim().replace(/\s+/g, ' ')
    .match(/^(?:zack detalle|dame m[aá]s informaci[oó]n)(?:\s+(.*))?$/i);
  if (!match) return { kind: 'ignored' };
  const query = (match[1] || '').replace(/^(?:de|sobre)\s+/i, '');
  if (query.length > 80) return { kind: 'ignored' };
  return { kind: 'read', command: 'detail', query };
}
function kpiRequest(command, query = '') {
  if (!['review', 'detail', 'help'].includes(command)) fail('financial_or_unknown_command');
  if (typeof query !== 'string' || query.length > 80
    || hasControlCharacter(query)) fail('invalid_query');
  if (command !== 'detail' && query !== '') fail('unexpected_query');
  return { method: 'GET', path: '/api/automation/deals/digest'
    + (command === 'detail' && query ? '?q=' + encodeURIComponent(query) : '') };
}

function selectMessages(rawMessages, config, previous, nowIso) {
  const settings = policy(config);
  checkpoint(previous);
  if (JSON.stringify(settings) !== JSON.stringify(policy(previous.policy))) fail('policy_changed');
  const now = dateMillis(nowIso);
  const cutoff = dateMillis(settings.reactivationAfter);
  if (cutoff > now) fail('future_cutoff');
  if (previous.cursor !== null && messageMillis(previous.cursor) > now) fail('future_cursor');
  if (previous.deliveries.some((entry) => entry.state !== 'confirmed')) fail('delivery_requires_review');
  if (!Array.isArray(rawMessages) || rawMessages.length > settings.pageLimit) fail('invalid_page');
  const stats = { input: rawMessages.length, old: 0, bots: 0, empty: 0,
    unauthorized: 0, ignored: 0, financialBlocked: 0, accepted: 0 };
  const rows = [];
  const seen = new Set();
  for (const message of rawMessages) {
    if (!record(message) || !record(message.author)) fail('invalid_message');
    const id = snowflake(message.id ?? message.messageId);
    const channelId = snowflake(message.channel_id ?? message.channelId);
    if (channelId !== settings.channelId) fail('channel_mismatch');
    if (seen.has(id)) fail('duplicate_message_id');
    seen.add(id);
    if (messageMillis(id) > now) fail('future_message');
    rows.push({ message, id });
  }
  rows.sort((left, right) => BigInt(left.id) < BigInt(right.id) ? -1 : 1);
  // A full latest-N page entirely after the boundary may conceal older unseen
  // messages. Do not silently advance past them; paginate/reconcile separately.
  if (rows.length === settings.pageLimit && rows.length > 0
    && messageMillis(rows[0].id) > cutoff && after(rows[0].id, previous.cursor)) {
    fail('page_gap_requires_review');
  }
  const messages = [];
  const commands = [];
  let candidateCursor = previous.cursor;
  for (const { message, id } of rows) {
    if (messageMillis(id) <= cutoff || !after(id, previous.cursor)) {
      stats.old += 1; continue;
    }
    candidateCursor = id;
    const author = message.author;
    if (author.bot !== undefined && typeof author.bot !== 'boolean') fail('invalid_bot_flag');
    if (author.bot === true || message.webhook_id !== undefined) {
      stats.bots += 1; continue;
    }
    const authorId = snowflake(author.id);
    if (typeof message.content !== 'string' || message.content.length > 4000) fail('invalid_content');
    const content = message.content.trim();
    if (!content) { stats.empty += 1; continue; }
    if (settings.mode === 'kpi') {
      if (!settings.allowedActorIds.includes(authorId)) { stats.unauthorized += 1; continue; }
      const command = classifyKpi(content);
      if (command.kind !== 'read') {
        stats[command.kind === 'financial_blocked' ? 'financialBlocked' : 'ignored'] += 1;
        continue;
      }
      commands.push({ sourceMessageId: id, command: command.command, query: command.query,
        ...kpiRequest(command.command, command.query) });
    }
    // Content is only the CRM request payload; never put messages/commands into logs.
    messages.push({ messageId: id, channelId: settings.channelId, authorId, content });
    stats.accepted += 1;
  }
  return { checkpointRevision: previous.revision, previousCursor: previous.cursor,
    candidateCursor, messages, commands, stats };
}

function validatePipelineResponse(messages, response) {
  if (!Array.isArray(messages) || messages.length === 0 || !record(response)
    || response.ok !== true || !Array.isArray(response.outcomes)
    || response.outcomes.length !== messages.length) fail('pipeline_invalid_response');
  if (!record(response.summary)) fail('pipeline_invalid_summary');
  for (const key of ['received', 'created', 'alreadySeen', 'ignored', 'failed',
    'draftsCreated', 'draftsAlreadySeen']) {
    integer(response.summary[key], 0, Number.MAX_SAFE_INTEGER);
  }
  if (response.summary.received !== messages.length || response.summary.failed !== 0) {
    fail('pipeline_partial_or_failed');
  }
  const expected = new Set(messages.map((message) => snowflake(message.messageId)));
  if (expected.size !== messages.length) fail('pipeline_duplicate_input');
  const acceptedIds = [];
  const reactions = [];
  const emoji = { missing_info: '⚠️', pending_review: '👀', created: '✅', rejected: '🚫' };
  for (const outcome of response.outcomes) {
    if (!record(outcome)) fail('pipeline_invalid_outcome');
    const id = snowflake(outcome.messageId);
    if (!expected.delete(id)) fail('pipeline_unexpected_or_duplicate_outcome');
    if (!['created', 'already_seen', 'ignored'].includes(outcome.result)) fail('pipeline_partial_or_failed');
    acceptedIds.push(id);
    if (outcome.result === 'created') {
      if (!Object.hasOwn(emoji, outcome.status)) fail('pipeline_unknown_status');
      integer(outcome.draftId, 1, Number.MAX_SAFE_INTEGER);
      reactions.push({ sourceMessageId: id, messageId: id, emoji: emoji[outcome.status] });
    }
  }
  for (const [result, counter] of [['created', 'created'], ['already_seen', 'alreadySeen'], ['ignored', 'ignored']]) {
    if (response.summary[counter] !== response.outcomes.filter((item) => item.result === result).length) {
      fail('pipeline_invalid_summary');
    }
  }
  return { acceptedIds, reactions };
}

function deliveryKey(delivery) {
  return delivery.kind + ':' + delivery.sourceMessageId + ':' + delivery.part;
}
function beginDelivery(previous, delivery) {
  checkpoint(previous);
  keys(delivery, ['sourceMessageId', 'part', 'kind']);
  snowflake(delivery.sourceMessageId);
  integer(delivery.part, 0, 99);
  if (!['reply', 'reaction'].includes(delivery.kind)) fail('invalid_delivery');
  if ((previous.policy.mode === 'kpi') !== (delivery.kind === 'reply')) fail('delivery_mode_mismatch');
  if (!after(delivery.sourceMessageId, previous.cursor)
    || messageMillis(delivery.sourceMessageId) <= dateMillis(previous.policy.reactivationAfter)) {
    fail('old_delivery');
  }
  if (previous.deliveries.some((entry) => entry.state !== 'confirmed')) fail('delivery_requires_review');
  if (previous.deliveries.some((entry) => deliveryKey(entry) === deliveryKey(delivery))) {
    fail('delivery_already_confirmed');
  }
  if (previous.deliveries.length >= 100) fail('ledger_capacity');
  return { ...copy(previous), revision: previous.revision + 1,
    deliveries: [...copy(previous.deliveries), { ...delivery, state: 'started', receiptId: null }] };
}
function completeDelivery(previous, delivery, receipt) {
  checkpoint(previous);
  keys(delivery, ['sourceMessageId', 'part', 'kind']);
  const found = previous.deliveries.find((entry) => deliveryKey(entry) === deliveryKey(delivery));
  if (!found || found.state !== 'started') fail('delivery_not_started');
  let receiptId = null;
  if (found.kind === 'reply') {
    keys(receipt, ['id', 'channelId']);
    receiptId = snowflake(receipt.id);
    if (snowflake(receipt.channelId) !== previous.policy.channelId) fail('receipt_channel_mismatch');
  } else {
    keys(receipt, ['httpStatus']);
    if (receipt.httpStatus !== 204) fail('reaction_not_confirmed');
  }
  return { ...copy(previous), revision: previous.revision + 1,
    deliveries: previous.deliveries.map((entry) => deliveryKey(entry) === deliveryKey(delivery)
      ? { ...entry, state: 'confirmed', receiptId } : { ...entry }) };
}
function markDeliveryUncertain(previous, delivery) {
  checkpoint(previous);
  keys(delivery, ['sourceMessageId', 'part', 'kind']);
  const found = previous.deliveries.find((entry) => deliveryKey(entry) === deliveryKey(delivery));
  if (!found || found.state !== 'started') fail('delivery_not_started');
  return { ...copy(previous), revision: previous.revision + 1,
    deliveries: previous.deliveries.map((entry) => deliveryKey(entry) === deliveryKey(delivery)
      ? { ...entry, state: 'uncertain' } : { ...entry }) };
}
function advanceCheckpoint(previous, scan, acceptedMessageIds) {
  checkpoint(previous);
  if (previous.deliveries.some((entry) => entry.state !== 'confirmed')) fail('delivery_requires_review');
  if (!record(scan) || scan.previousCursor !== previous.cursor
    || !Number.isSafeInteger(scan.checkpointRevision) || scan.checkpointRevision > previous.revision) {
    fail('stale_scan');
  }
  if (!Array.isArray(acceptedMessageIds) || !Array.isArray(scan.messages)) fail('invalid_acceptance');
  const expected = new Set(scan.messages.map((message) => snowflake(message.messageId)));
  const accepted = new Set(acceptedMessageIds.map(snowflake));
  if (accepted.size !== acceptedMessageIds.length || expected.size !== scan.messages.length
    || accepted.size !== expected.size || [...expected].some((id) => !accepted.has(id))) fail('partial_acceptance');
  if (scan.candidateCursor !== null) snowflake(scan.candidateCursor);
  if (scan.candidateCursor !== previous.cursor && !after(scan.candidateCursor, previous.cursor)) fail('cursor_regression');
  const cursor = scan.candidateCursor;
  return { ...copy(previous), revision: previous.revision + 1, cursor,
    deliveries: previous.deliveries.filter((entry) => after(entry.sourceMessageId, cursor)) };
}
function assertPersistedTransition(previous, next, observed) {
  checkpoint(previous); checkpoint(next); checkpoint(observed);
  if (next.revision !== previous.revision + 1
    || JSON.stringify(next) !== JSON.stringify(observed)) fail('checkpoint_not_persisted');
  // Also require CAS succeeded/exclusive ownership in the persistence adapter.
  // An object comparison alone cannot prove durability or exclusive ownership.
  return true;
}

const restorationGates = { createCheckpoint, classifyKpi, kpiRequest, selectMessages,
  validatePipelineResponse, beginDelivery, completeDelivery, markDeliveryUncertain,
  advanceCheckpoint, assertPersistedTransition, HELP_TEXT };
if (typeof module !== 'undefined') module.exports = restorationGates;
