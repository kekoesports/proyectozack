import { TRPCError } from '@trpc/server';

const mockSwitches = { enabled: true, send: false };

jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: {
  get CREATOR_INTAKE_ENABLED() { return mockSwitches.enabled; },
  get CREATOR_INTAKE_SEND_ENABLED() { return mockSwitches.send; },
  CREATOR_INTAKE_TELEGRAM_SECRET: 'TEST_123456789012345678901234567890123456',
  CREATOR_INTAKE_TELEGRAM_CONNECTION: 'TEST-connection', CREATOR_INTAKE_TELEGRAM_OWNER: '999',
  CREATOR_INTAKE_TELEGRAM_CHATS: '123', CREATOR_INTAKE_START_AT: '2026-01-01T00:00:00.000Z',
} }));
jest.mock('@/lib/db', () => ({ db: { update: jest.fn() } }));
jest.mock('@/lib/queries/creatorIntake', () => ({ creatorIntake: { ingest: jest.fn() } }));
jest.mock('@/lib/intake/extractor', () => ({ extractCreatorIntake: jest.fn() }));
jest.mock('@/lib/intake/delivery', () => ({ deliverIntake: jest.fn() }));
jest.mock('@/lib/intake/telegram-send', () => ({ sendIntakeTelegram: jest.fn() }));

import { POST } from '@/app/api/webhooks/creator-intake/telegram/route';
import { env } from '@/lib/env';
import { creatorIntake } from '@/lib/queries/creatorIntake';
import { deliverIntake } from '@/lib/intake/delivery';

const ingest = jest.mocked(creatorIntake.ingest);
const delivery = jest.mocked(deliverIntake);
function request(body: string, secret: string | null = env.CREATOR_INTAKE_TELEGRAM_SECRET ?? null): Request {
  return new Request('https://example.invalid/api/webhooks/creator-intake/telegram', {
    method: 'POST', body, headers: secret ? { 'x-telegram-bot-api-secret-token': secret } : {},
  });
}
const update = () => ({ update_id: 1, business_message: {
  message_id: 1, date: Math.floor(Date.now() / 1000), business_connection_id: 'TEST-connection',
  from: { id: 123 }, chat: { id: 123, type: 'private' }, text: 'TEST hello',
} });

beforeEach(() => {
  jest.clearAllMocks();
  mockSwitches.enabled = true;
  mockSwitches.send = false;
  ingest.mockResolvedValue({ id: 'TEST-conversation', duplicate: false });
});

describe('creator intake webhook authentication and boundaries', () => {
  it('fails closed before processing when disabled', async () => {
    mockSwitches.enabled = false;
    expect((await POST(request(JSON.stringify(update())))).status).toBe(503);
    expect(ingest).not.toHaveBeenCalled();
  });
  it.each([null, 'wrong', 'TEST_wrong123456789012345678901234567890123456'])('rejects invalid authentication', async (secret) => {
    expect((await POST(request(JSON.stringify(update()), secret))).status).toBe(401);
    expect(ingest).not.toHaveBeenCalled();
    expect(delivery).not.toHaveBeenCalled();
  });
  it('rejects malformed and oversized bodies before persistence', async () => {
    expect((await POST(request('{'))).status).toBe(400);
    expect((await POST(request('x'.repeat(32001)))).status).toBe(413);
    expect((await POST(request('{}'))).status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });
  it('does nothing without a new message', async () => {
    expect((await POST(request('{"update_id":1}'))).status).toBe(200);
    expect(ingest).not.toHaveBeenCalled();
    expect(delivery).not.toHaveBeenCalled();
  });
  it('does not send during review mode', async () => {
    expect((await POST(request(JSON.stringify(update())))).status).toBe(200);
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(delivery).not.toHaveBeenCalled();
  });
  it('returns a stable conflict response without exposing raw error details', async () => {
    ingest.mockRejectedValue(new TRPCError({ code: 'CONFLICT', message: 'TEST private content' }));
    const response = await POST(request(JSON.stringify(update())));
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain('TEST private content');
    expect(delivery).not.toHaveBeenCalled();
  });
});
