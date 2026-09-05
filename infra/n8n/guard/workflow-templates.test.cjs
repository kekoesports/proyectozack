'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mapping, patchWorkflow } = require('./workflow-patch.cjs');

const entries = [
  ['socialpro-deal-intake.json', 'n6pokPQopt9zCxRT', 'intake'],
  ['socialpro-pipeline-deals-reader.json', 'nc3uM2MgX4dXgCxb', 'pipeline'],
  ['socialpro-kpi-reporting-bot.json', 'kpiReportBot2026', 'kpi'],
  ['socialpro-discord-deal-created-notifications.json', 'spDealCreatedAck1', 'notify'],
  ['socialpro-deal-digest.json', '9UtIeT62q9YlqTOU', 'digest'],
  ['socialpro-progress-alerts.json', '6GYz63LAHOfTVA54', 'progress'],
];
function operationalNodes(nodes) {
  return nodes.map(node => {
    const clean = structuredClone(node);
    delete clean.notes; delete clean.credentials;
    if (clean.type !== 'n8n-nodes-base.httpRequest') clean.disabled = clean.disabled ?? false;
    return clean;
  });
}
for (const [file, id, family] of entries) {
  test('safe import matches the final runtime patch contract: ' + family, () => {
    assert.equal(mapping[id], family);
    const template = JSON.parse(fs.readFileSync(path.join(__dirname, '../workflows', file), 'utf8'));
    const expected = patchWorkflow({ ...template, id }, 'final');
    assert.equal(template.active, false);
    assert.deepEqual(operationalNodes(template.nodes), operationalNodes(expected.nodes));
    assert.deepEqual(template.connections, expected.connections);
    assert.deepEqual(template.settings, expected.settings);
    const requests = template.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].parameters.url, 'http://socialpro-internal-guard:8787/run/' + family);
    for (const node of template.nodes.filter(n => n.type !== 'n8n-nodes-base.scheduleTrigger')) {
      assert.deepEqual(node.credentials, { httpHeaderAuth: {
        id: 'REPLACE_WITH_INTERNAL_GUARD_HEADER_AUTH_ID', name: 'SocialPro Internal Guard Header Auth',
      } });
    }
    assert.equal(JSON.stringify(template).includes('$getWorkflowStaticData'), false);
  });
}
