jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: { CREATOR_INTAKE_WAHA_URL: 'http://waha.invalid',
  CREATOR_INTAKE_WAHA_KEY: 'TEST-key', CREATOR_INTAKE_WAHA_SESSION: 'default',
  CREATOR_INTAKE_WHATSAPP_PHONE: '34000000000', CREATOR_INTAKE_WHATSAPP_CHATS: '34000000001',
} }));
import { resolveWahaPeer } from '@/lib/intake/waha-peer';
const originalFetch = global.fetch;
const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const fixture = () => ({ event: 'message.any', session: 'default', me: { id: '34000000000@c.us' },
  payload: { id: 'TEST-LID', from: '123456@lid', to: '34000000000@c.us', fromMe: false,
    timestamp: Date.now() / 1000, body: 'TEST hola' } });
beforeEach(() => { jest.clearAllMocks(); global.fetch = fetchMock; });
afterAll(() => { global.fetch = originalFetch; });
it('resolves verified incoming and owner LIDs while preserving the message identity', async () => {
  fetchMock.mockImplementation(async () => Response.json({ lid: '123456@lid', pn: '34000000001@c.us' }));
  const input = fixture();
  expect((await resolveWahaPeer(input)).payload).toMatchObject({ id: 'TEST-LID', from: '34000000001@c.us' });
  expect((await resolveWahaPeer({ ...input, payload: { ...input.payload, fromMe: true, to: '123456@lid' } })).payload)
    .toMatchObject({ to: '34000000001@c.us' });
  expect((await resolveWahaPeer({ ...input, payload: { ...input.payload, fromMe: true, to: null } })).payload)
    .toMatchObject({ to: '34000000001@c.us' });
});
it('leaves unresolved mappings in the durable retry path rather than creating a LID contact', async () => {
  const input = fixture();
  for (const mapping of [{ lid: null, pn: '34000000001@c.us' },
    { lid: '654321@lid', pn: '34000000001@c.us' }, { lid: '123456@lid', pn: null }]) {
    fetchMock.mockResolvedValueOnce(Response.json(mapping));
    await expect(resolveWahaPeer(input)).rejects.toThrow('identity-unresolved');
  }
});
it('resolves non-pilot contacts without granting reply permission', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ lid: '123456@lid', pn: '34000000002@c.us' }));
  expect((await resolveWahaPeer(fixture())).payload).toMatchObject({ from: '34000000002@c.us' });
  expect(fetchMock.mock.calls[0]?.[0]).toContain('/lids/123456%40lid');
});
it('does not resolve unrelated accounts, sessions, non-messages or groups', async () => {
  const input = fixture();
  for (const update of [{ ...input, session: 'other' }, { ...input, me: null }, { ...input, event: 'message.ack' },
    { ...input, payload: { ...input.payload, from: '123456@g.us' } }]) expect(await resolveWahaPeer(update)).toEqual(update);
  expect(fetchMock).not.toHaveBeenCalled();
});
