import { createHmac } from 'node:crypto';
const mockSwitches = { enabled: true, send: false };
jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: {
  CREATOR_INTAKE_ENABLED: true,
  get CREATOR_INTAKE_WHATSAPP_ENABLED() { return mockSwitches.enabled; },
  get CREATOR_INTAKE_SEND_ENABLED() { return mockSwitches.send; },
  CREATOR_INTAKE_WHATSAPP_APP_SECRET: 'TEST-123456789012345678901234567890123456',
  CREATOR_INTAKE_WHATSAPP_VERIFY_TOKEN: 'TEST-123456789012345678901234567890123456',
  CREATOR_INTAKE_WHATSAPP_WABA: '111', CREATOR_INTAKE_WHATSAPP_PHONE_ID: '222',
  CREATOR_INTAKE_WHATSAPP_PHONE: '34000000000', CREATOR_INTAKE_WHATSAPP_CHATS: '34000000001',
  CREATOR_INTAKE_START_AT: '2026-01-01T00:00:00.000Z',
} }));
jest.mock('@/lib/db', () => ({ db: { update: jest.fn() } }));
jest.mock('@/lib/queries/creatorIntake', () => ({ creatorIntake: { ingest: jest.fn() } }));
jest.mock('@/lib/intake/extractor', () => ({ extractCreatorIntake: jest.fn() }));
jest.mock('@/lib/intake/delivery', () => ({ deliverIntake: jest.fn() }));
jest.mock('@/lib/intake/whatsapp-send', () => ({ sendIntakeWhatsApp: jest.fn() }));
import { GET, POST } from '@/app/api/webhooks/creator-intake/whatsapp/route';
import { creatorIntake } from '@/lib/queries/creatorIntake';
import { deliverIntake } from '@/lib/intake/delivery';
const ingest = jest.mocked(creatorIntake.ingest);
const delivery = jest.mocked(deliverIntake);
const secret = 'TEST-123456789012345678901234567890123456';
const message = () => ({ id: 'wamid.TEST', from: '34000000001', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'TEST hola' } });
const update = () => ({ object: 'whatsapp_business_account', entry: [{ id: '111', changes: [{ field: 'messages',
  value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '222' }, messages: [message()] } }] }] });
function request(body: string, signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`): Request {
  return new Request('https://example.invalid/api/webhooks/creator-intake/whatsapp', {
    method: 'POST', body, headers: { 'x-hub-signature-256': signature },
  });
}
beforeEach(() => { jest.clearAllMocks(); mockSwitches.enabled = true; mockSwitches.send = false;
  ingest.mockResolvedValue({ id: 'TEST-conversation', duplicate: false }); });

it('verifies the subscription challenge without touching persistence', async () => {
  const url = `https://example.invalid?hub.mode=subscribe&hub.verify_token=${secret}&hub.challenge=12345`;
  expect(await (await GET(new Request(url))).text()).toBe('12345');
  expect((await GET(new Request(url.replace(secret, 'wrong')))).status).toBe(403);
  expect(ingest).not.toHaveBeenCalled();
});
it('rejects disabled, unauthenticated, malformed and oversized requests before persistence', async () => {
  mockSwitches.enabled = false;
  expect((await POST(request(JSON.stringify(update())))).status).toBe(503);
  mockSwitches.enabled = true;
  expect((await POST(request('{', 'sha256=wrong'))).status).toBe(401);
  expect((await POST(request('{'))).status).toBe(400);
  expect((await POST(request('x'.repeat(32001)))).status).toBe(413);
  expect(ingest).not.toHaveBeenCalled();
});
it('ignores no-message delivery and ingests without sending in review mode', async () => {
  expect((await POST(request(JSON.stringify({ object: 'whatsapp_business_account', entry: [] })))).status).toBe(200);
  expect(ingest).not.toHaveBeenCalled();
  expect((await POST(request(JSON.stringify(update())))).status).toBe(200);
  expect(ingest).toHaveBeenCalledTimes(1);
  expect(delivery).not.toHaveBeenCalled();
});
it('persists owner echoes before creator messages and sends only after the complete batch', async () => {
  mockSwitches.send = true;
  const batch = update();
  const changes: unknown[] = [...(batch.entry[0]?.changes ?? []), { field: 'smb_message_echoes', value: {
    messaging_product: 'whatsapp', metadata: { phone_number_id: '222' },
    message_echoes: [{ ...message(), id: 'wamid.TEST-owner', from: '34000000000', to: '34000000001' }],
  } }];
  expect((await POST(request(JSON.stringify({ ...batch, entry: [{ id: '111', changes }] })))).status).toBe(200);
  expect(ingest.mock.calls.map(([event]) => event.actor)).toEqual(['owner', 'creator']);
  expect(delivery).toHaveBeenCalledTimes(1);
  expect(delivery.mock.calls[0]?.[4]).toBe('whatsapp');
  expect(delivery.mock.invocationCallOrder[0]).toBeGreaterThan(ingest.mock.invocationCallOrder[1] ?? Infinity);
});
