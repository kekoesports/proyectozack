'use strict';
const mapping = {
  n6pokPQopt9zCxRT: 'intake', nc3uM2MgX4dXgCxb: 'pipeline',
  kpiReportBot2026: 'kpi', spDealCreatedAck1: 'notify',
  '9UtIeT62q9YlqTOU': 'digest', '6GYz63LAHOfTVA54': 'progress'
};
const credential = { httpHeaderAuth: { id: 'K8HEAkSfOaiMLkRD', name: 'SocialPro CRM - Production' } };
function patchWorkflow(original, phase = 'final') {
  const family = mapping[original.id];
  if (!family || !['test', 'final'].includes(phase) || (phase === 'test' && family !== 'notify')) throw Error('workflow_scope');
  const triggers = original.nodes.filter(n => ['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.webhook'].includes(n.type))
    .filter(n => phase !== 'test' || n.type.endsWith('.webhook'))
    .map((node, index) => ({ ...node, disabled: false, position: [-500, index * 180] }));
  if (phase === 'final' && !triggers.some(n => n.type.endsWith('.webhook'))) {
    triggers.push({
      id: 'internal-probe-' + family, name: 'Verificación interna autenticada',
      type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [-500, 180],
      webhookId: 'socialpro-guard-probe-' + family,
      parameters: { httpMethod: 'POST', path: 'socialpro-internal-check-' + family + '-20260905',
        authentication: 'headerAuth', responseMode: 'lastNode', options: {} },
      credentials: credential,
      notes: 'Prueba interna autorizada. Digest/progreso usan body.probe=true; los lectores solo aceptan mensajes nuevos.'
    });
  }
  if (!triggers.length) throw Error('missing_trigger');
  const operation = {
    id: 'durable-internal-' + family, name: 'Procesar ' + family + ' con registro persistente',
    type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [40, 0],
    credentials: credential, retryOnFail: true, maxTries: 3, waitBetweenTries: 3000,
    parameters: { method: 'POST', url: 'http://socialpro-internal-guard:8787/run/' + family,
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}',
      options: { timeout: 170000 } },
    notes: 'Sólo rutas internas permitidas; ledger fsync, identidad estable y recibo Discord antes de ACK. No facturas, pagos, emails, contratos ni replay histórico. Código versionado: infra/n8n/guard.'
  };
  const nodes = [...triggers], connections = {};
  let first = operation.name;
  if (phase === 'test') {
    const filter = { id: 'controlled-test-gate', name: 'Sólo prueba E2E autorizada', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [-230, 0], parameters: { jsCode:
        "return $input.all().filter(item => typeof item.json.body?.testEventId === 'string' && item.json.body.testEventId.startsWith('SOCIALPRO_N8N_E2E_TEST_'));" } };
    nodes.push(filter); first = filter.name;
    connections[filter.name] = { main: [[{ node: operation.name, type: 'main', index: 0 }]] };
  }
  for (const trigger of triggers) connections[trigger.name] = { main: [[{ node: first, type: 'main', index: 0 }]] };
  nodes.push(operation);
  return {
    name: original.name, nodes, connections,
    settings: { executionOrder: 'v1', timezone: 'Europe/Madrid', saveManualExecutions: true,
      saveDataSuccessExecution: 'all', saveDataErrorExecution: 'all', executionTimeout: 600 }
  };
}
module.exports = { mapping, patchWorkflow };
