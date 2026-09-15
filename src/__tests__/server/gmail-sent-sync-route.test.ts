const mockVerifyAutomationToken = jest.fn();
const mockPersistGmailSent = jest.fn();

jest.mock('@/lib/security/assertAutomationAuth', () => ({
  verifyAutomationToken: (...args: unknown[]) => mockVerifyAutomationToken(...args),
}));
jest.mock('@/lib/queries/gmailSentSync', () => ({
  persistGmailSentCreatorEmail: (...args: unknown[]) => mockPersistGmailSent(...args),
}));

import { POST } from '@/app/api/automation/creator-outreach/gmail-sent/route';

const valid = {
  gmailId: '18feed123abc',
  threadId: '18feed456def',
  sentAt: '2026-09-15T15:30:00.000Z',
  from: 'PCAMACHO@SOCIALPRO.ES',
  to: ['creator@example.com'],
  subject: 'Propuesta SocialPro',
  text: 'Hola, ¿hablamos?',
};

function request(body: unknown): Request {
  return new Request('https://socialpro.es/api/automation/creator-outreach/gmail-sent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer synthetic-token' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/automation/creator-outreach/gmail-sent', () => {
  beforeEach(() => {
    mockVerifyAutomationToken.mockReset();
    mockPersistGmailSent.mockReset();
  });

  it('falla cerrado sin autenticación de automatización', async () => {
    mockVerifyAutomationToken.mockReturnValue({ ok: false, reason: 'unauthorized' });
    const response = await POST(request(valid));
    expect(response.status).toBe(401);
    expect(mockPersistGmailSent).not.toHaveBeenCalled();
  });

  it('rechaza payloads que no cumplen el contrato', async () => {
    mockVerifyAutomationToken.mockReturnValue({ ok: true });
    const response = await POST(request({ ...valid, gmailId: '../invalid' }));
    expect(response.status).toBe(400);
    expect(mockPersistGmailSent).not.toHaveBeenCalled();
  });

  it('normaliza y registra el envío una sola vez', async () => {
    mockVerifyAutomationToken.mockReturnValue({ ok: true });
    mockPersistGmailSent.mockResolvedValue({ duplicate: false, matched: true });
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, duplicate: false, matched: true });
    expect(mockPersistGmailSent).toHaveBeenCalledWith(expect.objectContaining({
      from: 'pcamacho@socialpro.es',
      cc: [],
      bcc: [],
    }));
  });
});
