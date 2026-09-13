import { IntakeEvent } from '@/lib/schemas/creatorIntake';
import { IntakeWahaMessage, type IntakeWahaUpdate } from '@/lib/schemas/intakeWaha';
import { wahaIntakeAccount } from './waha-account';

export function normalizeWahaIntake(update: IntakeWahaUpdate, config: {
  session: string; phone: string; chats: string[]; startAt: string; now: Date; run?: string;
}): IntakeEvent | null {
  if (update.event !== 'message.any' || update.session !== config.session
    || update.me?.id !== `${config.phone}@c.us`) return null;
  const parsed = IntakeWahaMessage.safeParse(update.payload);
  if (!parsed.success) return null;
  const message = parsed.data;
  // Never infer a phone from a LID, group, newsletter or broadcast identifier.
  // GOWS app/API echoes use `from` as the chat peer and may omit `to`.
  const peer = message.fromMe ? message.to ?? message.from : message.from;
  if (!peer?.endsWith('@c.us')) return null;
  const chatId = peer.slice(0, -5);
  if (!config.chats.includes(chatId) || chatId === config.phone) return null;
  const occurredAt = new Date(message.timestamp * 1000);
  const age = config.now.getTime() - occurredAt.getTime();
  if (!Number.isFinite(age) || age < -60_000 || age > 5 * 60_000
    || occurredAt < new Date(config.startAt)) return null;
  const text = message.hasMedia ? '[Adjunto recibido; requiere revisión humana]'
    : message.body?.trim();
  const event = IntakeEvent.safeParse({ channel: 'whatsapp', accountId: wahaIntakeAccount(config.phone, config.run),
    chatId, externalId: message.id, occurredAt: occurredAt.toISOString(),
    actor: message.fromMe ? 'owner' : 'creator', text });
  return event.success ? event.data : null;
}
