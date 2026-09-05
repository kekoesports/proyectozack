import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const WorkflowNode = z.object({
  id: z.string(), name: z.string(),
  type: z.enum(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.webhook', 'n8n-nodes-base.httpRequest']),
  parameters: z.record(z.string(), z.unknown()),
  credentials: z.object({ httpHeaderAuth: z.object({ id: z.string(), name: z.string() }).strict() }).strict().optional(),
  notes: z.string().optional(), disabled: z.boolean().optional(),
  retryOnFail: z.boolean().optional(), maxTries: z.number().optional(),
  waitBetweenTries: z.number().optional(), onError: z.string().optional(),
}).passthrough();
const Workflow = z.object({
  name: z.string(), active: z.literal(false), nodes: z.array(WorkflowNode),
  connections: z.record(z.string(), z.object({ main: z.array(z.array(z.object({
    node: z.string(), type: z.literal('main'), index: z.literal(0),
  }).strict())) }).strict()),
  settings: z.object({ executionOrder: z.literal('v1'), timezone: z.literal('Europe/Madrid'),
    saveManualExecutions: z.boolean(), saveDataSuccessExecution: z.string(),
    saveDataErrorExecution: z.string(), executionTimeout: z.number(),
  }).strict(),
}).strict();
type Workflow = z.infer<typeof Workflow>;

export function workflow(name: string): Workflow {
  const raw: unknown = JSON.parse(readFileSync(resolve(process.cwd(), 'infra/n8n/workflows', name), 'utf8'));
  const parsed = Workflow.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid guarded n8n template: ' + name);
  return parsed.data;
}
export function expectGuardOnly(value: Workflow, family: string) {
  const operations = value.nodes.filter(node => node.type === 'n8n-nodes-base.httpRequest');
  expect(operations).toHaveLength(1);
  const operation = operations[0];
  if (!operation) throw new Error('Missing internal guard operation');
  expect(operation).toMatchObject({ id: 'durable-internal-' + family,
    retryOnFail: true, maxTries: 3, waitBetweenTries: 3000,
    parameters: { method: 'POST', url: 'http://socialpro-internal-guard:8787/run/' + family,
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}',
      options: { timeout: 170000 } },
  });
  expect(operation.onError).toBeUndefined();
  const triggers = value.nodes.filter(node => node !== operation);
  expect(triggers.length).toBeGreaterThan(0);
  expect(Object.keys(value.connections).sort()).toEqual(triggers.map(node => node.name).sort());
  for (const trigger of triggers) {
    expect(trigger.disabled).not.toBe(true);
    expect(value.connections[trigger.name]).toEqual({ main: [[{ node: operation.name, type: 'main', index: 0 }]] });
    if (trigger.type === 'n8n-nodes-base.webhook') {
      expect(trigger.parameters).toMatchObject({ httpMethod: 'POST', authentication: 'headerAuth',
        responseMode: family === 'notify' ? 'onReceived' : 'lastNode' });
    }
  }
  // Binding is mandatory; an importable template must never contain live credentials.
  for (const node of value.nodes.filter(node => node.type !== 'n8n-nodes-base.scheduleTrigger')) {
    expect(node.credentials).toEqual({ httpHeaderAuth: {
      id: 'REPLACE_WITH_INTERNAL_GUARD_HEADER_AUTH_ID', name: 'SocialPro Internal Guard Header Auth',
    } });
  }
  expect(value.active).toBe(false);
  expect(operation.notes).toContain('infra/n8n/guard');
  expect(operation.notes).toContain('ledger fsync');
  const serialized = JSON.stringify(value);
  for (const forbidden of ['$getWorkflowStaticData', 'invoice_create', '/api/automation/',
    'n8n-nodes-base.noOp', 'n8n-nodes-base.discord', 'n8n-nodes-base.gmail',
    'n8n-nodes-base.googleDrive', 'n8n-nodes-base.code', 'K8HEAkSfOaiMLkRD']) {
    expect(serialized).not.toContain(forbidden);
  }
  return operation;
}
