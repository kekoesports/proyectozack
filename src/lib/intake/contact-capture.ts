import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { intakeConversations, intakeMessages } from '@/db/schema/creatorIntake';
import type { IntakeDatabase } from './repository';
import type { IntakeWahaUpdate } from '@/lib/schemas/intakeWaha';
import { IntakeProfile } from '@/lib/schemas/creatorIntake';
import { wahaIntakeAccount } from './waha-account';

const Message = z.object({
  id: z.string().min(1).max(160), timestamp: z.number().finite().positive(),
  from: z.string().max(160), to: z.string().max(160).nullish(), fromMe: z.boolean(),
  body: z.string().max(20000).nullish(), hasMedia: z.boolean().optional(),
  media: z.object({ mimetype: z.string().max(150).nullish(), filename: z.string().max(200).nullish() }).nullish(),
});
type CaptureConfig = { session: string; phone: string; startAt: string; now: Date; excludedChats: string[] };

function sharedProfile(text: string, current: IntakeProfile): IntakeProfile {
  const socials = [...(current.socials ?? [])];
  const hosts = { 'twitch.tv': 'twitch', 'kick.com': 'kick', 'youtube.com': 'youtube',
    'youtu.be': 'youtube', 'instagram.com': 'instagram', 'tiktok.com': 'tiktok' } as const;
  for (const match of text.match(/(?:https?:\/\/|www\.)[^\s<>]+/gi) ?? []) {
    try {
      const url = new URL((match.startsWith('www.') ? `https://${match}` : match).replace(/[),.;\]}]+$/, ''));
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      const platform = Object.entries(hosts).find(([key]) => key === host)?.[1];
      if (!platform || !url.pathname.replaceAll('/', '') || url.username || url.password) continue;
      url.protocol = 'https:'; url.search = ''; url.hash = '';
      const link = url.href.replace(/\/$/, '');
      if (!socials.some((s) => s.url.toLowerCase() === link.toLowerCase())) socials.push({ platform, url: link });
    } catch { /* Keep malformed links in the source message for manual review. */ }
  }
  const emails = [...new Set(text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? [])];
  const parsed = IntakeProfile.safeParse({ ...current,
    ...(socials.length ? { socials: socials.slice(-12) } : {}),
    ...(!current.email && emails.length === 1 ? { email: emails[0] } : {}),
  });
  return parsed.success ? parsed.data : current;
}

/** Passive registration only. No extractor, outbox, reply or paid API dependency. */
export function normalizeContactCapture(update: IntakeWahaUpdate, config: CaptureConfig) {
  if (update.event !== 'message.any' || update.session !== config.session
    || update.me?.id !== `${config.phone}@c.us`) return null;
  const parsed = Message.safeParse(update.payload);
  if (!parsed.success) return null;
  const message = parsed.data;
  const peer = message.fromMe ? message.to ?? message.from : message.from;
  if (!/^\d{7,15}@c\.us$/.test(peer) || peer === `${config.phone}@c.us`
    || config.excludedChats.some((id) => peer === `${id}@c.us`)) return null;
  const occurredAt = new Date(message.timestamp * 1000);
  if (occurredAt < new Date(config.startAt) || occurredAt.getTime() > config.now.getTime() + 60000) return null;
  const body = message.body?.trim() ?? '';
  // Service notices and authentication secrets never belong to candidate records.
  if (/\b(?:verification|confirmation|security|login) code\b|c[oó]digo de (?:verificaci[oó]n|confirmaci[oó]n|seguridad)|bienvenida a WhatsApp Business/i.test(body)) return null;
  if (/^\s*\[?(?:TEST|QA)\b/i.test(body)) return null;
  const attachment = message.hasMedia
    ? `[Adjunto recibido; revisar en WhatsApp. Tipo: ${message.media?.mimetype ?? 'sin identificar'}; archivo: ${message.media?.filename ?? 'sin nombre'}; mensaje: ${message.id}]` : '';
  const text = [body, attachment].filter(Boolean).join('\n');
  if (!text) return null;
  return {
    channel: 'whatsapp' as const, accountId: wahaIntakeAccount(config.phone), chatId: peer.slice(0, -5),
    externalId: message.id, actor: message.fromMe ? 'owner' as const : 'creator' as const,
    text, occurredAt,
  };
}

export async function captureWhatsAppContact(database: IntakeDatabase, update: IntakeWahaUpdate, config: CaptureConfig) {
  const event = normalizeContactCapture(update, config);
  if (!event) return { captured: false, duplicate: false };
  const fingerprint = createHash('sha256').update(JSON.stringify(event)).digest('hex');
  return database.transaction(async (tx) => {
    // Outbound messages can update an existing inbound contact, never create one.
    if (event.actor === 'creator') await tx.insert(intakeConversations).values({
      channel: event.channel, accountId: event.accountId, chatId: event.chatId,
      state: 'human', reason: 'passive_contact_capture',
    }).onConflictDoNothing();
    const [conversation] = await tx.select().from(intakeConversations).where(and(
      eq(intakeConversations.channel, event.channel), eq(intakeConversations.accountId, event.accountId),
      eq(intakeConversations.chatId, event.chatId),
    )).for('update');
    if (!conversation) return { captured: false, duplicate: false };
    const [prior] = await tx.select({ fingerprint: intakeMessages.fingerprint }).from(intakeMessages).where(and(
      eq(intakeMessages.conversationId, conversation.id), eq(intakeMessages.externalId, event.externalId),
    ));
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new Error('capture-message-conflict');
      return { captured: true, duplicate: true };
    }
    await tx.insert(intakeMessages).values({ conversationId: conversation.id,
      externalId: event.externalId, fingerprint, actor: event.actor, text: event.text, occurredAt: event.occurredAt });
    await tx.update(intakeConversations).set({
      updatedAt: new Date(), version: conversation.version + 1,
      ...(event.actor === 'creator' ? { profile: sharedProfile(event.text, conversation.profile) } : {}),
      ...(event.actor === 'creator' && (!conversation.lastInboundAt || event.occurredAt > conversation.lastInboundAt)
        ? { lastInboundAt: event.occurredAt } : {}),
    }).where(eq(intakeConversations.id, conversation.id));
    return { captured: true, duplicate: false };
  });
}
