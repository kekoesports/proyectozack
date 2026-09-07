const mockVerify = jest.fn();
const mockPersist = jest.fn();

jest.mock('@/lib/email/sendResendEmail', () => ({
  resend: { webhooks: { verify: (...args: unknown[]) => mockVerify(...args) } },
}));
jest.mock('@/lib/email/resendWebhook', () => ({
  persistResendWebhookEvent: (...args: unknown[]) => mockPersist(...args),
}));

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/webhooks/resend/route';

const payload = JSON.stringify({
  type: 'email.delivered',
  created_at: '2026-09-07T09:00:00.000Z',
  data: { email_id: 'email_123', to: ['person@example.com'] },
});

function request(): NextRequest {
  return new NextRequest('https://socialpro.es/api/webhooks/resend', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': 'svix_123',
      'svix-timestamp': '1788771600',
      'svix-signature': 'v1,synthetic-signature',
    },
    body: payload,
  });
}

describe('POST /api/webhooks/resend', () => {
  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_synthetic_test_secret';
    mockVerify.mockReset();
    mockPersist.mockReset();
  });

  afterAll(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  it('fails closed when signature verification rejects the request', async () => {
    mockVerify.mockImplementation(() => { throw new Error('invalid signature'); });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('persists only the verified payload and acknowledges duplicates', async () => {
    const verified = JSON.parse(payload) as unknown;
    mockVerify.mockReturnValue(verified);
    mockPersist.mockResolvedValue({ duplicate: true, suppressed: 0 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, duplicate: true });
    expect(mockVerify).toHaveBeenCalledWith(expect.objectContaining({
      payload,
      webhookSecret: 'whsec_synthetic_test_secret',
    }));
    expect(mockPersist).toHaveBeenCalledWith('svix_123', verified);
  });

  it('acknowledges a validly signed unrelated event without storing it', async () => {
    mockVerify.mockReturnValue({ type: 'domain.updated', data: { id: 'domain_123' } });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: true });
    expect(mockPersist).not.toHaveBeenCalled();
  });
});
