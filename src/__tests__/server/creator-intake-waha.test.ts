import { normalizeWahaIntake } from '@/lib/intake/waha-normalize';
const now = new Date();
const config = { session: 'default', phone: '34000000000', chats: ['34000000001'],
  startAt: new Date(now.getTime() - 60_000).toISOString(), now };
const update = () => ({ event: 'message.any', session: 'default', me: { id: '34000000000@c.us' }, payload: {
  id: 'false_34000000001@c.us_TEST', from: '34000000001@c.us', to: '34000000000@c.us',
  fromMe: false, timestamp: now.getTime() / 1000, body: 'TEST hola',
} });
it('isolates account and recipient, ignoring groups, LIDs and non-message events', () => {
  const fixture = update();
  expect(normalizeWahaIntake(fixture, config)?.actor).toBe('creator');
  expect(normalizeWahaIntake({ ...fixture, session: 'other' }, config)).toBeNull();
  expect(normalizeWahaIntake({ ...fixture, me: { id: '34000000002@c.us' } }, config)).toBeNull();
  for (const from of ['34000000002@c.us', '34000000001@g.us', '34000000001@lid', 'status@broadcast']) {
    expect(normalizeWahaIntake({ ...fixture, payload: { ...fixture.payload, from } }, config)).toBeNull();
  }
  expect(normalizeWahaIntake({ ...fixture, event: 'message.ack' }, config)).toBeNull();
});
it('ignores history/future and routes media to human review', () => {
  const fixture = update();
  for (const offset of [-3600, 3600]) expect(normalizeWahaIntake({ ...fixture,
    payload: { ...fixture.payload, timestamp: now.getTime() / 1000 + offset } }, config)).toBeNull();
  expect(normalizeWahaIntake({ ...fixture, payload: { ...fixture.payload, hasMedia: true } }, config)?.text)
    .toBe('[Adjunto recibido; requiere revisión humana]');
});
it('recognizes a reply from the company mobile as owner', () => {
  const fixture = update();
  const event = normalizeWahaIntake({ ...fixture, payload: { ...fixture.payload, fromMe: true,
    from: '34000000000@c.us', to: '34000000001@c.us' } }, config);
  expect(event).toMatchObject({ actor: 'owner', chatId: '34000000001', accountId: 'waha:34000000000' });
  expect(normalizeWahaIntake({ ...fixture, payload: { ...fixture.payload, fromMe: true, to: null } }, config))
    .toMatchObject({ actor: 'owner', chatId: '34000000001' });
});
it('keeps contact identity stable across named runs and reconnects', () => {
  expect(normalizeWahaIntake(update(), { ...config, run: 'onboarding-v2' })?.accountId).toBe('waha:34000000000');
  expect(normalizeWahaIntake(update(), config)?.accountId).toBe('waha:34000000000');
});
