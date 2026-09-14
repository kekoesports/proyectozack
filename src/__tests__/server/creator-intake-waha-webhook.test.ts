const mockSwitches = { enabled: true, send: false };
jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: { CREATOR_INTAKE_ENABLED: true,
  get CREATOR_INTAKE_WAHA_ENABLED() { return mockSwitches.enabled; },
  get CREATOR_INTAKE_SEND_ENABLED() { return mockSwitches.send; },
  CREATOR_INTAKE_WAHA_SECRET: 'TEST-secret', CREATOR_INTAKE_WAHA_SESSION: 'default',
  CREATOR_INTAKE_WHATSAPP_PHONE: '34000000000', CREATOR_INTAKE_WHATSAPP_CHATS: '34000000001',
  CREATOR_INTAKE_WAHA_START_AT: '2026-01-01T00:00:00.000Z',
} }));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/intake/inbox', () => ({ enqueueWaha: jest.fn() }));
jest.mock('@/lib/queries/creatorIntake', () => ({ creatorIntake: { ingest: jest.fn() } }));
jest.mock('@/lib/intake/extractor', () => ({ extractCreatorIntake: jest.fn() }));
jest.mock('@/lib/intake/delivery', () => ({ deliverIntake: jest.fn() }));
jest.mock('@/lib/intake/waha-send', () => ({ sendIntakeWaha: jest.fn() }));
import { POST } from '@/app/api/webhooks/creator-intake/waha/route';
import { creatorIntake } from '@/lib/queries/creatorIntake';
import { deliverIntake } from '@/lib/intake/delivery';
import { enqueueWaha } from '@/lib/intake/inbox';
const ingest = jest.mocked(creatorIntake.ingest);
const request = (body: string, secret = 'TEST-secret') => new Request('https://example.invalid', {
  method: 'POST', body, headers: { 'x-socialpro-waha-secret': secret },
});
const fixture = () => ({ event: 'message.any', session: 'default', me: { id: '34000000000@c.us' }, payload: {
  id: 'TEST-1', from: '34000000001@c.us', to: '34000000000@c.us', fromMe: false,
  timestamp: Date.now() / 1000, body: 'TEST hola',
} });
beforeEach(() => { jest.clearAllMocks(); mockSwitches.enabled = true; mockSwitches.send = false;
  jest.mocked(enqueueWaha).mockResolvedValue({ ok: true, id: 'TEST-event' });
  ingest.mockResolvedValue({ id: 'TEST-conversation', duplicate: false }); });
it('rejects disabled, unauthenticated, malformed and oversized requests before persistence', async () => {
  mockSwitches.enabled = false;
  expect((await POST(request('{}'))).status).toBe(503);
  mockSwitches.enabled = true;
  expect((await POST(request('{}', 'wrong'))).status).toBe(401);
  expect((await POST(request('{'))).status).toBe(400);
  expect((await POST(request('x'.repeat(32001)))).status).toBe(413);
  expect(ingest).not.toHaveBeenCalled();
});
it('ignores ACKs and excluded chats without AI or delivery', async () => {
  await POST(request(JSON.stringify({ ...fixture(), event: 'message.ack' })));
  const excluded = fixture(); excluded.payload.from = '34000000002@c.us';
  await POST(request(JSON.stringify(excluded)));
  expect(ingest).not.toHaveBeenCalled(); expect(deliverIntake).not.toHaveBeenCalled();
});
it('acknowledges only durable receipt and never generates a reply in the receiver', async () => {
  expect((await POST(request(JSON.stringify(fixture())))).status).toBe(202);
  expect(enqueueWaha).toHaveBeenCalledTimes(1); expect(deliverIntake).not.toHaveBeenCalled();
  mockSwitches.send = true;
  await POST(request(JSON.stringify(fixture())));
  expect(deliverIntake).not.toHaveBeenCalled();
  expect(ingest).not.toHaveBeenCalled();
});
it('requests provider retry when persistence is unavailable', async () => {
  jest.mocked(enqueueWaha).mockRejectedValue(new Error('fixture database unavailable'));
  expect((await POST(request(JSON.stringify(fixture())))).status).toBe(503);
});
