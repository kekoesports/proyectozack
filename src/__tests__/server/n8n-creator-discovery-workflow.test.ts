import { z } from 'zod';
import { workflow } from './n8n-guard-workflow-fixture';

const CreatorWakeup = z.object({
  method: z.literal('POST'), url: z.literal('http://socialpro-internal-guard:8787/run/creators'),
  authentication: z.literal('genericCredentialType'), genericAuthType: z.literal('httpHeaderAuth'),
  sendBody: z.literal(true), specifyBody: z.literal('json'), jsonBody: z.literal('{}'),
  options: z.object({ timeout: z.literal(170000) }).strict(),
}).strict();
const value = workflow('socialpro-creator-discovery-digest.json');
const request = value.nodes.find(node => node.type === 'n8n-nodes-base.httpRequest');
if (!request) throw new Error('Missing creators wake-up node');
const parameters = request.parameters;

describe('Creator Discovery n8n wake-up template (no import or execution)', () => {
  it('is inactive by default and has no remote workflow identity', () => {
    expect(value.active).toBe(false);
    expect(value).not.toHaveProperty('id');
    expect(value).not.toHaveProperty('versionId');
  });
  it('contains exactly one two-minute schedule and one internal request, with no alternate trigger', () => {
    expect(value.nodes.map(node => node.type)).toEqual(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.httpRequest']);
    expect(value.nodes[0]?.parameters).toEqual({ rule: { interval: [{ field: 'minutes', minutesInterval: 2 }] } });
    expect(value.connections).toEqual({ 'Cada dos minutos': {
      main: [[{ node: 'Procesar creators con registro persistente', type: 'main', index: 0 }]],
    } });
  });
  it('reuses the protected templates header-credential reference, never a token or new credential', () => {
    const previous = workflow('socialpro-kpi-reporting-bot.json').nodes.find(node => node.type === 'n8n-nodes-base.httpRequest');
    expect(request.credentials).toEqual(previous?.credentials);
    expect(request.credentials).toEqual({ httpHeaderAuth: {
      id: 'REPLACE_WITH_INTERNAL_GUARD_HEADER_AUTH_ID', name: 'SocialPro Internal Guard Header Auth',
    } });
    expect(parameters).not.toHaveProperty('headerParameters');
    expect(parameters).not.toHaveProperty('sendHeaders');
  });
  it('only calls the existing creators route with an immutable empty body', () => {
    expect(CreatorWakeup.safeParse(parameters).success).toBe(true);
    expect(JSON.stringify(parameters)).not.toContain('$json');
    expect(JSON.stringify(parameters)).not.toContain('$env');
  });
  it('has bounded waits and no immediate retry or continue-on-error branch', () => {
    expect(request.retryOnFail).toBe(false);
    expect(request.maxTries).toBeUndefined();
    expect(request.waitBetweenTries).toBeUndefined();
    expect(request.onError).toBeUndefined();
    expect(request).not.toHaveProperty('continueOnFail');
    expect(value.settings.executionTimeout).toBe(180);
    expect(value.settings.timezone).toBe('Europe/Madrid');
  });
  it.each([
    'https://discord.com/api/v10/channels/fixture/messages',
    'https://socialpro.es/api/automation/discord/creator-discovery',
    'http://socialpro-internal-guard:8787/run/notify',
    'http://socialpro-internal-guard:8787/run/invoices',
    'http://socialpro-internal-guard:8787/run/payments',
    'http://socialpro-internal-guard:8787/run/outreach',
    'http://example.invalid/run/creators',
  ])('rejects an external or out-of-scope destination: %s', url => {
    expect(CreatorWakeup.safeParse({ ...parameters, url }).success).toBe(false);
  });
  it.each(['{"since":"2020-01-01T00:00:00.000Z"}', '{"message":"synthetic"}', '{"channelId":"100000000000000001"}',
    '{"probe":true}', '={{ JSON.stringify($json.body || {}) }}'])('rejects injected input or historical override: %s', jsonBody => {
    expect(CreatorWakeup.safeParse({ ...parameters, jsonBody }).success).toBe(false);
  });
  it('has no cursor, historical selection, financial, email or provider nodes outside the guard', () => {
    const serialized = JSON.stringify(value.nodes.map(node => ({ type: node.type, parameters: node.parameters })));
    for (const forbidden of ['$getWorkflowStaticData', 'since=', '/api/automation/', 'invoice_create',
      'n8n-nodes-base.discord', 'n8n-nodes-base.gmail', 'n8n-nodes-base.code', 'n8n-nodes-base.webhook',
      'n8n-nodes-base.executeWorkflow', 'n8n-nodes-base.noOp']) expect(serialized).not.toContain(forbidden);
    expect(request.notes).toContain('No reinicializar policy o journal');
    expect(value.nodes[0]?.notes).toContain('no importada ni activada');
  });
});
