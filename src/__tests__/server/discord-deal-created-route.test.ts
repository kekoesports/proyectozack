jest.mock('server-only', () => ({}));

const verifyAutomationToken = jest.fn();
const listPendingDiscordDealCreatedNotifications = jest.fn();
const acknowledgeDiscordDealCreatedNotification = jest.fn();

jest.mock('@/lib/security/assertAutomationAuth', () => ({
  verifyAutomationToken: (req: Request) => verifyAutomationToken(req),
}));
jest.mock('@/lib/queries/automationDiscordDealNotifications', () => ({
  listPendingDiscordDealCreatedNotifications: (...args: unknown[]) =>
    listPendingDiscordDealCreatedNotifications(...args),
  acknowledgeDiscordDealCreatedNotification: (...args: unknown[]) =>
    acknowledgeDiscordDealCreatedNotification(...args),
}));

import { GET } from '@/app/api/automation/discord/deal-created/route';
import { POST } from '@/app/api/automation/discord/deal-created/[id]/ack/route';

function req(path = '/api/automation/discord/deal-created'): Request {
  return new Request(`https://socialpro.es${path}`, { method: path.endsWith('/ack') ? 'POST' : 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  verifyAutomationToken.mockReturnValue({ ok: true });
  listPendingDiscordDealCreatedNotifications.mockResolvedValue([]);
  acknowledgeDiscordDealCreatedNotification.mockResolvedValue('acknowledged');
});

describe('GET /api/automation/discord/deal-created', () => {
  it('falla cerrado sin la credencial compartida', async () => {
    verifyAutomationToken.mockReturnValue({ ok: false, reason: 'unauthorized' });
    const response = await GET(req());

    expect(response.status).toBe(401);
    expect(listPendingDiscordDealCreatedNotifications).not.toHaveBeenCalled();
  });

  it('solo expone las confirmaciones pendientes', async () => {
    const notification = {
      draftId: 7,
      campaignId: 102,
      channelId: '1533123521574862991',
      dealName: 'The Real Fer x SkinsMonkey',
      documentUrl: 'https://docs.google.com/spreadsheets/d/sheet-id/edit',
      sharedWithInfluencer: true,
      message: 'TRATO CREADO CORRECTAMENTE',
    };
    listPendingDiscordDealCreatedNotifications.mockResolvedValue([notification]);

    const response = await GET(req());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, notifications: [notification] });
  });
});

describe('POST /api/automation/discord/deal-created/:id/ack', () => {
  it('rechaza identificadores inválidos antes de escribir', async () => {
    const response = await POST(req('/api/automation/discord/deal-created/no/ack'), {
      params: Promise.resolve({ id: 'no' }),
    });

    expect(response.status).toBe(400);
    expect(acknowledgeDiscordDealCreatedNotification).not.toHaveBeenCalled();
  });

  it('confirma el envío de forma idempotente', async () => {
    acknowledgeDiscordDealCreatedNotification.mockResolvedValue('already_acknowledged');
    const response = await POST(req('/api/automation/discord/deal-created/7/ack'), {
      params: Promise.resolve({ id: '7' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, acknowledged: false });
    expect(acknowledgeDiscordDealCreatedNotification).toHaveBeenCalledWith(7);
  });

  it('devuelve 404 si el borrador no es una confirmación válida', async () => {
    acknowledgeDiscordDealCreatedNotification.mockResolvedValue('not_found');
    const response = await POST(req('/api/automation/discord/deal-created/99/ack'), {
      params: Promise.resolve({ id: '99' }),
    });

    expect(response.status).toBe(404);
  });
});
