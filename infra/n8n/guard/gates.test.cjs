'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const gates = require('./gates.cjs');
const T0 = '2026-09-05T12:00:00.000Z';
const NOW = '2026-09-05T12:01:00.000Z';
const CHANNEL = '111111111111111111';
const ACTOR = '222222222222222222';
const OTHER = '333333333333333333';
const idAt = (offset, sequence = 0n) =>
  (((BigInt(Date.parse(T0) + offset) - 1420070400000n) << 22n) + sequence).toString();
const config = (mode = 'pipeline', overrides = {}) => ({ mode, channelId: CHANNEL,
  reactivationAfter: T0, allowedActorIds: mode === 'kpi' ? [ACTOR] : [],
  pageLimit: 25, ...overrides });
const state = (mode = 'pipeline', cursor = null) => gates.createCheckpoint(config(mode), cursor);
const message = (offset = 1000, content = 'synthetic deal', overrides = {}) => ({
  id: idAt(offset), channel_id: CHANNEL, content, author: { id: ACTOR, bot: false }, ...overrides,
});
const scan = (messages, mode = 'pipeline', current = state(mode)) =>
  gates.selectMessages(messages, config(mode), current, NOW);
const expectGate = (fn, code) => assert.throws(fn,
  (error) => error instanceof Error && error.message === 'restoration_gate:' + code);
const delivery = (kind = 'reply', part = 0) => ({ sourceMessageId: idAt(1000), part, kind });
const replyReceipt = { id: idAt(2000), channelId: CHANNEL };
const responseWith = (outcomes) => ({ ok: true, outcomes, summary: {
  received: outcomes.length,
  created: outcomes.filter((entry) => entry.result === 'created').length,
  alreadySeen: outcomes.filter((entry) => entry.result === 'already_seen').length,
  ignored: outcomes.filter((entry) => entry.result === 'ignored').length,
  failed: outcomes.filter((entry) => entry.result === 'failed').length,
  draftsCreated: 0, draftsAlreadySeen: 0,
} });

test('checkpoint preserves cursor and has no message content', () => {
  const value = state('pipeline', idAt(-1));
  assert.equal(value.cursor, idAt(-1));
  assert.equal(value.policy.reactivationAfter, T0);
  assert.equal(value.revision, 0);
  assert.deepEqual(value.deliveries, []);
});
test('configuration missing/extra keys, empty KPI allowlist and duplicate actor fail closed', () => {
  expectGate(() => gates.createCheckpoint({ ...config(), token: 'synthetic' }, null), 'invalid_shape');
  expectGate(() => gates.createCheckpoint(config('kpi', { allowedActorIds: [] }), null), 'invalid_allowlist');
  expectGate(() => gates.createCheckpoint(config('kpi', { allowedActorIds: [ACTOR, ACTOR] }), null), 'invalid_allowlist');
});
test('dates must be strict and immutable; absent cursor never becomes now', () => {
  expectGate(() => gates.createCheckpoint(config('pipeline',
    { reactivationAfter: '2026-02-30T12:00:00.000Z' }), null), 'invalid_date');
  expectGate(() => gates.selectMessages([], config('pipeline',
    { reactivationAfter: '2026-09-05T12:00:01.000Z' }), state(), NOW), 'policy_changed');
  const future = config('pipeline', { reactivationAfter: '2026-09-05T12:02:00.000Z' });
  expectGate(() => gates.selectMessages([], future, gates.createCheckpoint(future, null), NOW), 'future_cutoff');
});
test('boundary millisecond and preserved cursor exclude old messages', () => {
  const initial = scan([message(-1000), message(0), message(1)]);
  assert.deepEqual(initial.messages.map((entry) => entry.messageId), [idAt(1)]);
  const resumed = scan([message(1000), message(2000)], 'pipeline', state('pipeline', idAt(1000)));
  assert.deepEqual(resumed.messages.map((entry) => entry.messageId), [idAt(2000)]);
});
test('no new messages produces no CRM requests or reactions', () => {
  let calls = 0;
  for (const input of [[], [message(-1)], [message(0)]]) {
    const result = scan(input);
    for (const ignored of result.messages) { void ignored; calls += 1; }
  }
  assert.equal(calls, 0);
});
test('bots, webhook messages and empty messages never reach CRM', () => {
  const result = scan([
    message(1000, 'x', { author: { id: ACTOR, bot: true } }),
    message(2000, 'x', { webhook_id: 'synthetic' }), message(3000, '   '),
  ]);
  assert.equal(result.messages.length, 0);
  assert.equal(result.stats.bots, 2);
  assert.equal(result.stats.empty, 1);
});
test('wrong channel, malformed bot flag, missing actor and future snowflake reject', () => {
  expectGate(() => scan([message(1000, 'x', { channel_id: OTHER })]), 'channel_mismatch');
  expectGate(() => scan([message(1000, 'x', { author: { id: ACTOR, bot: 'false' } })]), 'invalid_bot_flag');
  expectGate(() => scan([message(1000, 'x', { author: {} })]), 'invalid_id');
  expectGate(() => scan([message(61000)]), 'future_message');
});
test('numeric IDs, impossible IDs and duplicate IDs are not coerced', () => {
  expectGate(() => scan([message(1000, 'x', { id: 123 })]), 'invalid_id');
  expectGate(() => scan([message(1000, 'x', { id: '99999999999999999999' })]), 'invalid_id');
  expectGate(() => scan([message(), message()]), 'duplicate_message_id');
});
test('full page beyond boundary holds instead of silently losing older unseen messages', () => {
  const rows = Array.from({ length: 25 }, (_, index) => message(index + 1));
  expectGate(() => scan(rows), 'page_gap_requires_review');
  rows[0] = message(-1);
  assert.equal(scan(rows).messages.length, 24);
});
test('accepted messages are chronological; metadata does not expose username', () => {
  const result = scan([message(3000), message(1000), message(2000)]);
  assert.deepEqual(result.messages.map((entry) => entry.messageId), [idAt(1000), idAt(2000), idAt(3000)]);
  assert.equal(result.candidateCursor, idAt(3000));
  assert.equal(Object.hasOwn(result.messages[0], 'authorUsername'), false);
});
test('KPI actor allowlist rejects an otherwise valid new command', () => {
  const result = scan([message(1000, 'zack revisa', { author: { id: OTHER, bot: false } })], 'kpi');
  assert.equal(result.commands.length, 0);
  assert.equal(result.messages.length, 0);
  assert.equal(result.stats.unauthorized, 1);
});
for (const alias of ['ok', 'zack ok', 'ok facturar', 'zack facturar', 'zack crea las facturas']) {
  test('financial alias never produces HTTP: ' + alias, () => {
    let httpCalls = 0;
    const result = scan([message(1000, '  ' + alias.toUpperCase() + '  ')], 'kpi');
    result.commands.forEach(() => { httpCalls += 1; });
    assert.equal(httpCalls, 0);
    assert.equal(result.stats.financialBlocked, 1);
    assert.deepEqual(gates.classifyKpi(alias), { kind: 'financial_blocked' });
  });
}
test('unrecognized/obfuscated financial text cannot construct a write', () => {
  for (const alias of ['OK!', 'facturar', 'zack invoice_create', 'ok\nfacturar', 'zack crea factura']) {
    assert.equal(scan([message(1000, alias)], 'kpi').commands.length, 0);
  }
  for (const command of ['invoice_create', 'POST', 'invoices', '', undefined]) {
    expectGate(() => gates.kpiRequest(command), 'financial_or_unknown_command');
  }
});
for (const content of ['zack revisa', 'zack revisa de nuevo', 'revisa de nuevo',
  'zack ayuda', 'ayuda zack', 'zack detalle synthetic', 'Dame más información sobre synthetic']) {
  test('read command creates only GET digest: ' + content, () => {
    const [command] = scan([message(1000, content)], 'kpi').commands;
    assert.equal(command.method, 'GET');
    assert.match(command.path, /^\/api\/automation\/deals\/digest(?:\?q=)?/);
    assert.equal(Object.hasOwn(command, 'body'), false);
    assert.equal(command.path.includes('/invoices'), false);
  });
}
test('detail cannot escape URL/query; help states invoicing disabled', () => {
  const result = gates.kpiRequest('detail', 'a&path=/api/automation/deals/invoices');
  assert.equal(result.path, '/api/automation/deals/digest?q=a%26path%3D%2Fapi%2Fautomation%2Fdeals%2Finvoices');
  expectGate(() => gates.kpiRequest('help', 'synthetic'), 'unexpected_query');
  expectGate(() => gates.kpiRequest('detail', 'a'.repeat(201)), 'invalid_query');
  assert.match(gates.HELP_TEXT, /Facturación desactivada/);
  assert.doesNotMatch(gates.HELP_TEXT, /crea los borradores/);
});
test('unknown command may advance cursor only as no-effect checkpoint transition', () => {
  const previous = state('kpi');
  const result = scan([message(1000, 'ordinary synthetic text')], 'kpi', previous);
  const next = gates.advanceCheckpoint(previous, result, []);
  assert.equal(next.cursor, idAt(1000));
  assert.equal(previous.cursor, null);
});
test('pipeline only complete unique successful outcomes produce reactions', () => {
  const batch = scan([message(1000), message(2000), message(3000)]).messages;
  const result = gates.validatePipelineResponse(batch, responseWith([
    { messageId: idAt(1000), result: 'created', status: 'pending_review', draftId: 1 },
    { messageId: idAt(2000), result: 'already_seen' },
    { messageId: idAt(3000), result: 'ignored' },
  ]));
  assert.equal(result.acceptedIds.length, 3);
  assert.deepEqual(result.reactions, [{ sourceMessageId: idAt(1000), messageId: idAt(1000), emoji: '👀' }]);
});
test('failed, missing, duplicate or unknown outcomes cannot advance pipeline or react', () => {
  const batch = scan([message(1000)]).messages;
  for (const response of [{}, { ok: false, outcomes: [] }, { ok: true, outcomes: [] }]) {
    expectGate(() => gates.validatePipelineResponse(batch, response), 'pipeline_invalid_response');
  }
  expectGate(() => gates.validatePipelineResponse(batch, responseWith([
    { messageId: idAt(1000), result: 'failed' }])), 'pipeline_partial_or_failed');
  expectGate(() => gates.validatePipelineResponse(batch, responseWith([
    { messageId: idAt(1000), result: 'created', status: 'invented', draftId: 1 }])), 'pipeline_unknown_status');
  expectGate(() => gates.validatePipelineResponse(batch, responseWith([
    { messageId: idAt(2000), result: 'ignored' }])), 'pipeline_unexpected_or_duplicate_outcome');
});
test('missing or contradictory pipeline summary fails closed', () => {
  const batch = scan([message(1000)]).messages;
  const valid = responseWith([{ messageId: idAt(1000), result: 'ignored' }]);
  expectGate(() => gates.validatePipelineResponse(batch, { ...valid, summary: undefined }), 'pipeline_invalid_summary');
  expectGate(() => gates.validatePipelineResponse(batch, { ...valid,
    summary: { ...valid.summary, failed: 1 } }), 'pipeline_partial_or_failed');
  expectGate(() => gates.validatePipelineResponse(batch, { ...valid,
    summary: { ...valid.summary, ignored: 0 } }), 'pipeline_invalid_summary');
});
test('future stored cursor cannot silently hide the current page', () => {
  expectGate(() => scan([], 'pipeline', state('pipeline', idAt(61000))), 'future_cursor');
});
test('policy ordering is canonical; detail query retains original accents and case', () => {
  const reordered = { pageLimit: 25, allowedActorIds: [], reactivationAfter: T0,
    channelId: CHANNEL, mode: 'pipeline' };
  assert.equal(gates.selectMessages([], reordered, state(), NOW).messages.length, 0);
  assert.equal(gates.classifyKpi('Dame más información sobre Synthetic Éxample').query, 'Synthetic Éxample');
});
test('partial acceptance, duplicate acceptance and cursor regression reject', () => {
  const previous = state();
  const result = scan([message(1000), message(2000)], 'pipeline', previous);
  expectGate(() => gates.advanceCheckpoint(previous, result, [idAt(1000)]), 'partial_acceptance');
  expectGate(() => gates.advanceCheckpoint(previous, result, [idAt(1000), idAt(1000)]), 'partial_acceptance');
  const current = state('pipeline', idAt(2000));
  expectGate(() => gates.advanceCheckpoint(current, { ...scan([], 'pipeline', current),
    candidateCursor: idAt(1000) }, []), 'cursor_regression');
});
test('delivery claim is immutable and must be persisted/read back before effect', () => {
  const previous = state('kpi');
  const next = gates.beginDelivery(previous, delivery());
  assert.equal(previous.deliveries.length, 0);
  assert.equal(next.revision, 1);
  assert.equal(next.deliveries[0].state, 'started');
  expectGate(() => gates.assertPersistedTransition(previous, next, previous), 'checkpoint_not_persisted');
  assert.equal(gates.assertPersistedTransition(previous, next, JSON.parse(JSON.stringify(next))), true);
});
test('started or uncertain delivery prevents later scan and blind repeated send', () => {
  const begun = gates.beginDelivery(state('kpi'), delivery());
  expectGate(() => scan([message(1000, 'zack revisa')], 'kpi', begun), 'delivery_requires_review');
  expectGate(() => gates.beginDelivery(begun, delivery()), 'delivery_requires_review');
  const uncertain = gates.markDeliveryUncertain(begun, delivery());
  assert.equal(uncertain.deliveries[0].state, 'uncertain');
  expectGate(() => gates.beginDelivery(uncertain, delivery()), 'delivery_requires_review');
  expectGate(() => gates.completeDelivery(uncertain, delivery(), replyReceipt), 'delivery_not_started');
});
test('reply confirms only matching-channel receipt; confirmed same part never sends again', () => {
  const begun = gates.beginDelivery(state('kpi'), delivery());
  expectGate(() => gates.completeDelivery(begun, delivery(), { ...replyReceipt, channelId: OTHER }),
    'receipt_channel_mismatch');
  const done = gates.completeDelivery(begun, delivery(), replyReceipt);
  assert.equal(done.deliveries[0].state, 'confirmed');
  expectGate(() => gates.beginDelivery(done, delivery()), 'delivery_already_confirmed');
});
test('reaction requires actual 204 receipt, never ok:true or missing response', () => {
  const item = delivery('reaction');
  const begun = gates.beginDelivery(state(), item);
  expectGate(() => gates.completeDelivery(begun, item, { httpStatus: 500 }), 'reaction_not_confirmed');
  expectGate(() => gates.completeDelivery(begun, item, { ok: true }), 'invalid_shape');
  assert.equal(gates.completeDelivery(begun, item, { httpStatus: 204 }).deliveries[0].state, 'confirmed');
});
test('multi-part partial delivery holds later polling and preserves confirmed part', () => {
  const previous = state('kpi');
  const first = gates.completeDelivery(gates.beginDelivery(previous, delivery()), delivery(), replyReceipt);
  const second = gates.beginDelivery(first, delivery('reply', 1));
  const uncertain = gates.markDeliveryUncertain(second, delivery('reply', 1));
  assert.deepEqual(uncertain.deliveries.map((entry) => entry.state), ['confirmed', 'uncertain']);
  expectGate(() => gates.advanceCheckpoint(uncertain, scan([message(1000, 'zack revisa')], 'kpi', previous),
    [idAt(1000)]), 'delivery_requires_review');
});
test('successful delivery advances cursor without pruning unconfirmed effects', () => {
  const previous = state('kpi');
  const result = scan([message(1000, 'zack revisa')], 'kpi', previous);
  const done = gates.completeDelivery(gates.beginDelivery(previous, delivery()), delivery(), replyReceipt);
  const next = gates.advanceCheckpoint(done, result, [idAt(1000)]);
  assert.equal(next.cursor, idAt(1000));
  assert.equal(next.deliveries.length, 0);
  assert.equal(scan([message(1000, 'zack revisa')], 'kpi', next).commands.length, 0);
});
test('old delivery, mismatched mode and malformed checkpoint are rejected', () => {
  expectGate(() => gates.beginDelivery(state('kpi', idAt(1000)), delivery()), 'old_delivery');
  expectGate(() => gates.beginDelivery(state('pipeline'), delivery()), 'delivery_mode_mismatch');
  expectGate(() => scan([], 'pipeline', { ...state(), revision: -1 }), 'invalid_integer');
});


test('loaded confirmed reply needs a receipt and matching mode', () => {
  const begun = gates.beginDelivery(state('kpi'), delivery());
  const noReceipt = { ...begun, deliveries: [{ ...begun.deliveries[0], state: 'confirmed' }] };
  expectGate(() => scan([], 'kpi', noReceipt), 'invalid_receipt');
  const wrongMode = { ...begun, deliveries: [{ ...begun.deliveries[0], kind: 'reaction' }] };
  expectGate(() => scan([], 'kpi', wrongMode), 'delivery_mode_mismatch');
});
test('digest query bound is exactly 80, never the obsolete 200', () => {
  assert.equal(gates.classifyKpi('zack detalle ' + 'a'.repeat(80)).kind, 'read');
  assert.equal(gates.classifyKpi('zack detalle ' + 'a'.repeat(81)).kind, 'ignored');
  expectGate(() => gates.kpiRequest('detail', 'a'.repeat(81)), 'invalid_query');
});
