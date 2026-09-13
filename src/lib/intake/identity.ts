import { and, eq } from 'drizzle-orm';
import { intakeConversations } from '@/db/schema/creatorIntake';
import { intakePeerAliases } from '@/db/schema/intakeReliability';
import { IntakeWahaMessage, type IntakeWahaUpdate } from '@/lib/schemas/intakeWaha';
import type { IntakeDatabase } from './repository';
import { wahaIntakeAccount } from './waha-account';

export function wahaPhone(peer: string): string | null {
  const digits = peer.replace(/^\+/, '').replace(/@(?:c\.us|s\.whatsapp\.net)$/, '');
  return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : null;
}

export async function ensureWahaIdentity(database: IntakeDatabase, original: IntakeWahaUpdate,
  resolved: IntakeWahaUpdate, companyPhone: string, canReply: boolean) {
  const before = IntakeWahaMessage.safeParse(original.payload);
  const after = IntakeWahaMessage.safeParse(resolved.payload);
  if (!before.success || !after.success) return null;
  const peer = after.data.fromMe ? after.data.to ?? after.data.from : after.data.from;
  const phone = wahaPhone(peer);
  if (!phone || phone === `+${companyPhone}`) return null;
  const originalPeer = before.data.fromMe ? before.data.to ?? before.data.from : before.data.from;
  const accountId = wahaIntakeAccount(companyPhone);
  const chatId = phone.slice(1);
  return database.transaction(async (tx) => {
    if (!after.data.fromMe) await tx.insert(intakeConversations).values({ accountId, chatId, channel: 'whatsapp',
      state: canReply ? 'bot' : 'human', reason: canReply ? null : 'passive_contact_capture',
    }).onConflictDoNothing();
    const [conversation] = await tx.select().from(intakeConversations).where(and(
      eq(intakeConversations.channel, 'whatsapp'), eq(intakeConversations.accountId, accountId),
      eq(intakeConversations.chatId, chatId),
    )).for('update');
    if (!conversation) return null;
    for (const alias of new Set([`pn:${phone}`, originalPeer, peer])) {
      const key = `${accountId}:${alias}`;
      await tx.insert(intakePeerAliases).values({ key, conversationId: conversation.id }).onConflictDoNothing();
      const [stored] = await tx.select().from(intakePeerAliases).where(eq(intakePeerAliases.key, key));
      if (stored?.conversationId !== conversation.id) throw new Error('identity-conflict');
    }
    return conversation.id;
  });
}
