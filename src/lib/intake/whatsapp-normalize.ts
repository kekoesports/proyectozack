import { IntakeEvent } from '@/lib/schemas/creatorIntake';
import type { IntakeWhatsAppUpdate } from '@/lib/schemas/intakeWhatsApp';

export function normalizeWhatsAppIntake(update: IntakeWhatsAppUpdate, config: {
  waba: string; phoneId: string; phone: string; chats: readonly string[]; startAt: string; now: Date;
}): IntakeEvent[] {
  const events: IntakeEvent[] = [];
  for (const entry of update.entry) {
    if (entry.id !== config.waba) continue;
    for (const change of entry.changes) {
      const owner = change.field === 'smb_message_echoes';
      // History, contacts, delivery statuses and unrelated account events never enter intake.
      if ((!owner && change.field !== 'messages') || change.value.messaging_product !== 'whatsapp'
        || change.value.metadata?.phone_number_id !== config.phoneId) continue;
      for (const message of (owner ? change.value.message_echoes : change.value.messages) ?? []) {
        const chatId = owner ? message.to : message.from;
        if (!chatId || !config.chats.includes(chatId) || chatId === config.phone
          || (owner && message.from !== config.phone)) continue;
        const timestamp = Number(message.timestamp) * 1000;
        if (!Number.isFinite(timestamp) || timestamp < Date.parse(config.startAt)
          || timestamp < config.now.getTime() - 300_000 || timestamp > config.now.getTime() + 60_000) continue;
        const parsed = IntakeEvent.safeParse({
          channel: 'whatsapp', accountId: config.phoneId, chatId, externalId: message.id,
          occurredAt: new Date(timestamp).toISOString(), actor: owner ? 'owner' : 'creator',
          text: message.type === 'text' ? message.text?.body
            : '[Adjunto recibido; requiere revisión humana]',
        });
        if (parsed.success) events.push(parsed.data);
      }
    }
  }
  // An owner reply in the same delivery must pause the chat before any automated reply.
  return events.sort((a, b) => Number(b.actor === 'owner') - Number(a.actor === 'owner')
    || Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
}
