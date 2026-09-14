jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: {
  CREATOR_INTAKE_ENABLED: true, CREATOR_INTAKE_SEND_ENABLED: true, CREATOR_INTAKE_WHATSAPP_ENABLED: true,
  CREATOR_INTAKE_WHATSAPP_TOKEN: 'TEST-token', CREATOR_INTAKE_WHATSAPP_PHONE_ID: '222',
  CREATOR_INTAKE_WHATSAPP_PHONE: '34000000000', CREATOR_INTAKE_WHATSAPP_CHATS: '34000000001',
} }));
jest.mock('@/lib/intake/owner-alert', () => ({ verifyIntakeOwnerAlert: jest.fn(), sendIntakeOwnerAlert: jest.fn() }));
import { sendIntakeWhatsApp } from '@/lib/intake/whatsapp-send';
import { verifyIntakeOwnerAlert } from '@/lib/intake/owner-alert';
import type { IntakeSender } from '@/lib/intake/delivery';

const input: Parameters<IntakeSender>[0] = { channel: 'whatsapp', kind: 'reply', accountId: '222',
  chatId: '34000000001', text: 'TEST reply', conversationId: 'TEST-id', lastInboundAt: new Date() };
const phone = { id: '222', display_phone_number: '+34 000 000 000', is_on_biz_app: true, platform_type: 'CLOUD_API' };
const alert = jest.mocked(verifyIntakeOwnerAlert);
let fetchSpy: jest.SpiedFunction<typeof fetch>;
beforeEach(() => { jest.clearAllMocks(); fetchSpy = jest.spyOn(global, 'fetch'); alert.mockResolvedValue(true); });
afterEach(() => fetchSpy.mockRestore());

it('cannot send across transports, to an unlisted chat, or outside the inbound window', async () => {
  for (const changed of [{ ...input, channel: 'telegram' as const }, { ...input, accountId: '333' },
    { ...input, chatId: '34000000002' }, { ...input, lastInboundAt: new Date(Date.now() - 86400001) }]) {
    expect(await sendIntakeWhatsApp(changed)).toBeNull();
  }
  expect(fetchSpy).not.toHaveBeenCalled();
});

it('fails closed when the owner destination is unavailable or phone is not coexistence', async () => {
  alert.mockResolvedValueOnce(false);
  expect(await sendIntakeWhatsApp(input)).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockResolvedValueOnce(Response.json({ ...phone, platform_type: 'APP' }));
  expect(await sendIntakeWhatsApp(input)).toBeNull();
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

it('checks the exact phone before sending and requires an accepted receipt', async () => {
  fetchSpy.mockResolvedValueOnce(Response.json(phone)).mockResolvedValueOnce(Response.json({
    messaging_product: 'whatsapp', messages: [{ id: 'wamid.TEST-receipt' }],
  }));
  expect(await sendIntakeWhatsApp(input)).toBe('wamid.TEST-receipt');
  expect(fetchSpy.mock.calls[1]?.[0]).toBe('https://graph.facebook.com/v26.0/222/messages');
  expect(fetchSpy.mock.calls[1]?.[1]?.body).toContain('34000000001');
  fetchSpy.mockResolvedValueOnce(Response.json(phone)).mockResolvedValueOnce(Response.json({ error: 'TEST' }, { status: 400 }));
  expect(await sendIntakeWhatsApp(input)).toBeNull();
});
