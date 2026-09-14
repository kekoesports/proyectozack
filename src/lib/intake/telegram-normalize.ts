import type { IntakeTelegramUpdate } from '@/lib/schemas/intakeTelegram';
import { IntakeEvent } from '@/lib/schemas/creatorIntake';

export function normalizeTelegramIntake(update: IntakeTelegramUpdate, config: {
  connection: string; owner: string; chats: readonly string[]; startAt: string; now: Date;
}): IntakeEvent | null {
  const message = update.business_message;
  if (!message || message.business_connection_id !== config.connection || message.chat.type !== 'private'
    || !message.from || message.sender_business_bot || message.from.is_bot) return null;
  const chatId = String(message.chat.id);
  if (!config.chats.includes(chatId)) return null;
  const timestamp = message.date * 1000;
  if (timestamp < Date.parse(config.startAt) || timestamp < config.now.getTime() - 5 * 60_000
    || timestamp > config.now.getTime() + 60_000) return null;
  const owner = String(message.from.id) === config.owner;
  if (!owner && message.from.id !== message.chat.id) return null;
  const parsed = IntakeEvent.safeParse({
    channel: 'telegram', accountId: config.connection, chatId,
    // Message ID is stable even if the provider re-wraps it in another update.
    externalId: `telegram:${message.message_id}`,
    occurredAt: new Date(timestamp).toISOString(), actor: owner ? 'owner' : 'creator',
    text: message.text ?? `[Adjunto recibido; requiere revisión humana] ${message.caption ?? ''}`,
  });
  return parsed.success ? parsed.data : null;
}
