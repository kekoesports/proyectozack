jest.mock('server-only', () => ({}));

const mockEnv: {
  AUTOMATION_API_TOKEN?: string;
  N8N_DEAL_CREATED_WEBHOOK_URL?: string;
} = {};

jest.mock('@/lib/env', () => ({ env: mockEnv }));

import { triggerDiscordDealCreatedWorkflow } from '@/lib/n8n/triggerDiscordDealCreated';

const originalFetch = global.fetch;

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
  delete mockEnv.AUTOMATION_API_TOKEN;
  delete mockEnv.N8N_DEAL_CREATED_WEBHOOK_URL;
});

describe('disparo inmediato de confirmaciones de Discord', () => {
  it('falla en cerrado cuando falta la configuración', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(triggerDiscordDealCreatedWorkflow()).resolves.toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('llama al webhook autenticado sin exponer el token en el body', async () => {
    mockEnv.AUTOMATION_API_TOKEN = 'automation-token-at-least-32-characters';
    mockEnv.N8N_DEAL_CREATED_WEBHOOK_URL = 'https://n8n.socialpro.es/webhook/deal-created';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    await expect(triggerDiscordDealCreatedWorkflow()).resolves.toBe('triggered');
    expect(fetchMock).toHaveBeenCalledWith(
      mockEnv.N8N_DEAL_CREATED_WEBHOOK_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockEnv.AUTOMATION_API_TOKEN}`,
        }),
        body: '{}',
      }),
    );
    expect(JSON.stringify(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain(
      mockEnv.AUTOMATION_API_TOKEN,
    );
  });

  it('deja el reintento al sondeo cuando n8n no responde', async () => {
    mockEnv.AUTOMATION_API_TOKEN = 'automation-token-at-least-32-characters';
    mockEnv.N8N_DEAL_CREATED_WEBHOOK_URL = 'https://n8n.socialpro.es/webhook/deal-created';
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));

    await expect(triggerDiscordDealCreatedWorkflow()).resolves.toBe('failed');
  });
});
