jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: { CREATOR_INTAKE_ENABLED: true, CREATOR_INTAKE_SEND_ENABLED: true,
  CREATOR_INTAKE_WAHA_ENABLED: true, CREATOR_INTAKE_WAHA_URL: 'http://waha.invalid',
  CREATOR_INTAKE_WAHA_KEY: 'TEST-key', CREATOR_INTAKE_WAHA_SESSION: 'default',
  CREATOR_INTAKE_WHATSAPP_PHONE: '34000000000', CREATOR_INTAKE_WHATSAPP_CHATS: '34000000001',
  CREATOR_INTAKE_WAHA_REPLY_TO_INBOUND: false,
} }));
jest.mock('@/lib/intake/owner-alert', () => ({ verifyIntakeOwnerAlert: jest.fn(), sendIntakeOwnerAlert: jest.fn() }));
import { sendIntakeWaha } from '@/lib/intake/waha-send';
import { verifyIntakeOwnerAlert } from '@/lib/intake/owner-alert';
import { env } from '@/lib/env';
const originalFetch = global.fetch;
const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const input = { kind: 'reply', text: 'TEST respuesta', channel: 'whatsapp' as const,
  accountId: 'waha:34000000000', chatId: '34000000001', conversationId: 'TEST-id', lastInboundAt: new Date() };
beforeEach(() => { jest.clearAllMocks(); jest.replaceProperty(env, 'CREATOR_INTAKE_WAHA_REPLY_TO_INBOUND', false); global.fetch = fetchMock; jest.mocked(verifyIntakeOwnerAlert).mockResolvedValue(true); });
afterAll(() => { global.fetch = originalFetch; });
it('rejects wrong channel, account and recipient without a network request', async () => {
  expect(await sendIntakeWaha({ ...input, channel: 'telegram' })).toBeNull();
  expect(await sendIntakeWaha({ ...input, accountId: 'other' })).toBeNull();
  expect(await sendIntakeWaha({ ...input, chatId: '34000000002' })).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
it('requires the working company session and available owner alerts', async () => {
  jest.mocked(verifyIntakeOwnerAlert).mockResolvedValue(false);
  await expect(sendIntakeWaha(input)).rejects.toThrow('send-preflight-unavailable'); expect(fetchMock).not.toHaveBeenCalled();
  jest.mocked(verifyIntakeOwnerAlert).mockResolvedValue(true);
  fetchMock.mockResolvedValueOnce(Response.json({ name: 'default', status: 'WORKING', me: { id: 'other@c.us' } }));
  await expect(sendIntakeWaha(input)).rejects.toThrow('send-preflight-unavailable'); expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('captures one send receipt and never retries an unknown receipt', async () => {
  const session = { name: 'default', status: 'WORKING', me: { id: '34000000000@c.us' } };
  fetchMock.mockResolvedValueOnce(Response.json(session)).mockResolvedValueOnce(Response.json({ id: 'TEST-ACK' }));
  expect(await sendIntakeWaha(input)).toBe('TEST-ACK');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fetchMock.mockClear();
  fetchMock.mockResolvedValueOnce(Response.json(session)).mockResolvedValueOnce(Response.json({}));
  expect(await sendIntakeWaha(input)).toBeNull(); expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('delivers to a new verified phone in inbound mode while retaining account and identity guards', async () => {
  jest.replaceProperty(env, 'CREATOR_INTAKE_WAHA_REPLY_TO_INBOUND', true);
  for (const chatId of ['34000000000', '12345@lid', '12345@g.us', 'bad', '00000000000']) {
    expect(await sendIntakeWaha({ ...input, chatId })).toBeNull();
  }
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(Response.json({ name: 'default', status: 'WORKING', me: { id: '34000000000@c.us' } }))
    .mockResolvedValueOnce(Response.json({ id: 'TEST-NEW-CONTACT-ACK' }));
  expect(await sendIntakeWaha({ ...input, chatId: '34000000002' })).toBe('TEST-NEW-CONTACT-ACK');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
