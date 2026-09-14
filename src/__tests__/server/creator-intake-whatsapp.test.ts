import { createHmac } from 'node:crypto';
import { IntakeWhatsAppUpdate } from '@/lib/schemas/intakeWhatsApp';
import { normalizeWhatsAppIntake } from '@/lib/intake/whatsapp-normalize';
import { verifyWhatsAppSignature, readWhatsAppBytes } from '@/lib/intake/whatsapp-signature';

const now = new Date('2026-09-10T12:00:00.000Z');
const config = { waba: '111', phoneId: '222', phone: '34000000000', chats: ['34000000001'],
  startAt: '2026-09-10T11:59:00.000Z', now };
const message = { id: 'wamid.TEST', from: '34000000001', timestamp: String(now.getTime() / 1000),
  type: 'text', text: { body: 'TEST hola' } };
const value = { messaging_product: 'whatsapp', metadata: { phone_number_id: '222' }, messages: [message] };
const update = { object: 'whatsapp_business_account', entry: [{ id: '111', changes: [{ field: 'messages', value }] }] };
function normalize(raw: unknown) {
  const parsed = IntakeWhatsAppUpdate.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid test fixture');
  return normalizeWhatsAppIntake(parsed.data, config);
}

it('authenticates exact raw bytes and rejects tampering, missing and malformed signatures', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify(update));
  const signature = `sha256=${createHmac('sha256', 'TEST-secret').update(bytes).digest('hex')}`;
  expect(verifyWhatsAppSignature(bytes, signature, 'TEST-secret')).toBe(true);
  for (const wrong of [null, '', 'sha256=abc', signature.replace(/.$/, 'z')]) {
    expect(verifyWhatsAppSignature(bytes, wrong, 'TEST-secret')).toBe(false);
  }
  expect(verifyWhatsAppSignature(bytes, signature, 'another-secret')).toBe(false);
  expect(verifyWhatsAppSignature(new TextEncoder().encode('{}'), signature, 'TEST-secret')).toBe(false);
  expect(await readWhatsAppBytes(new Request('https://example.invalid', { method: 'POST', body: 'x'.repeat(32001) }))).toBeNull();
});

it('preserves stable message identity on retry and puts human echoes first', () => {
  const inbound = normalize(update);
  expect(inbound[0]).toMatchObject({ externalId: message.id, channel: 'whatsapp', actor: 'creator' });
  expect(normalize(update)).toEqual(inbound);
  const both = normalize({ ...update, entry: [{ id: '111', changes: [{ field: 'messages', value }, {
    field: 'smb_message_echoes', value: { ...value, messages: undefined,
      message_echoes: [{ ...message, id: 'wamid.TEST-owner', from: config.phone, to: config.chats[0] }] },
  }] }] });
  expect(both.map((event) => event.actor)).toEqual(['owner', 'creator']);
});

it('ignores history, status-only events, other accounts, destinations and stale messages', () => {
  const changes = [
    { field: 'history', value }, { field: 'messages', value: { ...value, messages: undefined } },
    { field: 'messages', value: { ...value, metadata: { phone_number_id: '333' } } },
    ...[{ from: '34000000002' }, { timestamp: String(now.getTime() / 1000 - 120) },
      { timestamp: String(now.getTime() / 1000 + 120) }].map((overrides) => ({ field: 'messages',
      value: { ...value, messages: [{ ...message, ...overrides }] } })),
  ];
  for (const change of changes) expect(normalize({ ...update, entry: [{ id: '111', changes: [change] }] })).toEqual([]);
  expect(normalize({ ...update, entry: [{ ...update.entry[0], id: '999' }] })).toEqual([]);
});

it('marks attachments for human review without downloading them', () => {
  const result = normalize({ ...update, entry: [{ id: '111', changes: [{ field: 'messages',
    value: { ...value, messages: [{ ...message, type: 'image', text: undefined }] } }] }] });
  expect(result[0]?.text).toBe('[Adjunto recibido; requiere revisión humana]');
});
