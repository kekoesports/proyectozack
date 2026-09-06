'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { digest } = require('./handlers.cjs');
const { pollKpi } = require('./pollers.cjs');
const { createCheckpoint } = require('./gates.cjs');
const { makeClients } = require('./clients.cjs');

// Load only the pure formatter functions from the real CRM source. Every imported
// DB/schema module is inert: no application bootstrap, .env loading or DB query.
const filename = path.resolve(__dirname, '../../../src/lib/queries/automationDealDigest.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleFixture = { exports: {} };
vm.runInNewContext('(function(exports, require, module) {' + output + '\n})', {}, { filename })(
  moduleFixture.exports, id => {
    assert.ok(id === 'server-only' || id === 'drizzle-orm' || id.startsWith('@/db/schema/') || id === '@/lib/db');
    return {};
  }, moduleFixture);
const { formatAutomationDealDigestForDiscord, shouldIncludeInDigest } = moduleFixture.exports;
const T0 = '2026-09-05T07:00:00.000Z', NOW = '2026-09-05T08:01:00.000Z';
const KPI = '1533123515023360114', PIPELINE = '1533123521574862991', ACTOR = '222222222222222222';
const sourceId = ((BigInt(Date.parse(NOW) - 1000) - 1420070400000n) << 22n).toString();
function reportFixture() {
  const row = (nextAction, i, progressPct = 45) => ({ campaignId: i, name: 'Trato TEST ' + i,
    talentName: 'Creador TEST ' + i, brandName: 'Marca TEST ' + i, nextAction,
    progressPct, currentCount: progressPct, targetCount: 100, inactiveDays: nextAction === 'stale' ? 12 : 1,
    invoiceNumber: null, invoiceStatus: null, syncError: nextAction === 'sync_error' ? 'TEST acceso no disponible' : null });
  const all = [row('sync_error', 1), row('completed', 2, 100), row('prepare_invoice', 3, 80),
    row('stale', 4, 40), ...Array.from({ length: 120 }, (_, i) => row('on_track', i + 5, 60)),
    row('missing_sheet', 130), row('empty_sheet', 131), row('missing_targets', 132),
    { ...row('completed', 133, 100), inactiveDays: 10 }];
  const deals = all.filter(shouldIncludeInDigest);
  const summary = { total: deals.length, syncErrors: 1, missingSheets: 1, missingTargets: 1,
    emptySheets: 1, completed: 1, excludedOldCompleted: all.length - deals.length,
    prepareInvoice: 1, stale: 1, inProgress: 120 };
  const messages = Array.from(formatAutomationDealDigestForDiscord({ generatedAt: NOW, staleAfterDays: 10, summary, deals }));
  return { messages, deals };
}
function fixture(messages) {
  const data = new Map(), external = [], reads = [];
  const config = { crmToken: 'synthetic-kpi-crm-token', discordToken: 'synthetic-kpi-discord-token',
    botId: '111111111111111111', guildId: '1522153792592806018', reactivationAfter: T0,
    kpiChannelId: KPI, pipelineChannelId: PIPELINE, allowedActorIds: [ACTOR] };
  const store = { get: async key => structuredClone(data.get(key) ?? null),
    put: async (key, value) => data.set(key, structuredClone(value)), lock: async (_key, fn) => fn() };
  const client = makeClients(config, store, async (url, init) => {
    assert.equal(url, 'https://discord.com/api/v10/channels/' + KPI + '/messages');
    assert.equal(init.method, 'POST'); const body = JSON.parse(init.body);
    assert.deepEqual(body.allowed_mentions, { parse: [] }); external.push(body.content);
    return Response.json({ id: String(555555555555555555n + BigInt(external.length)), channel_id: KPI, timestamp: NOW });
  });
  const ctx = { config, store, lock: store.lock, ...client, now: () => NOW,
    crm: async (route, options = {}) => {
      assert.equal(route, '/api/automation/deals/digest'); assert.equal(options.method || 'GET', 'GET');
      reads.push(route); return { ok: true, discordMessages: messages };
    },
    discordMessages: async channel => {
      assert.equal(channel, KPI);
      return [{ id: sourceId, channel_id: KPI, author: { id: ACTOR, bot: false }, content: 'zack revisa' }];
    } };
  data.set('poll-kpi-checkpoint', createCheckpoint({ mode: 'kpi', channelId: KPI,
    reactivationAfter: T0, allowedActorIds: [ACTOR], pageLimit: 100 }, null));
  data.set('poll-kpi-pending', null);
  return { ctx, external, reads };
}
test('real KPI formatter retains five detailed sections, all names/bars and count-only blanks', () => {
  const { messages } = reportFixture(), text = messages.join('\n');
  assert.ok(messages.length > 6 && messages.length <= 30); assert.ok(messages.every(part => part.length <= 1900));
  for (const section of ['ERRORES DE SINCRONIZACIÓN', 'COMPLETADOS', 'LISTOS PARA FACTURAR', 'PARADOS', 'EN PROGRESO']) {
    assert.ok(text.includes(section));
  }
  for (let i = 1; i <= 124; i++) assert.ok(text.includes('Creador TEST ' + i + ' × Marca TEST ' + i + '** · Trato TEST ' + i));
  for (const pct of [100, 80, 40, 60]) assert.ok(text.includes('**' + pct + '%**'));
  assert.ok(text.includes('`▰▰▰▱▱`')); assert.ok(text.includes('12 días sin avance'));
  assert.ok(text.includes('1 hojas en blanco')); assert.ok(text.includes('1 completados antiguos omitidos'));
  for (const i of [130, 131, 132, 133]) assert.ok(!text.includes('Creador TEST ' + i));
});
test('scheduled digest delivers every exact formatter part to KPI and replay has no extra POST', async () => {
  const { messages } = reportFixture(), f = fixture(messages);
  const first = await digest(f.ctx); assert.equal(first.delivered, messages.length);
  assert.deepEqual(f.external, messages);
  const replay = await digest(f.ctx); assert.equal(replay.duplicates, messages.length);
  assert.equal(f.external.length, messages.length);
});
test('zack revisa delivers every exact formatter part to KPI and repeated poll does nothing new', async () => {
  const { messages } = reportFixture(), f = fixture(messages);
  assert.equal((await pollKpi(f.ctx)).ok, true); assert.deepEqual(f.external, messages);
  assert.equal((await pollKpi(f.ctx)).noNewMessages, true);
  assert.equal(f.external.length, messages.length); assert.equal(f.reads.length, 1);
});
