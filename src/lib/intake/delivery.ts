import { and, eq, sql } from 'drizzle-orm';
import { intakeConversations, intakeOutbox } from '@/db/schema/creatorIntake';
import type { IntakeDatabase } from './repository';
import { IntakeSendNotAttempted } from './send-errors';

export type IntakeSender = (input: {
  kind: string; text: string; accountId: string; chatId: string; conversationId: string;
  channel: 'telegram' | 'whatsapp'; lastInboundAt: Date;
}) => Promise<string | null>;

/** No blind retry: a crash after claim leaves `sending`, requiring reconciliation. */
export async function deliverIntake(database: IntakeDatabase, conversationId: string, send: IntakeSender, cutoff: Date,
  channel: 'telegram' | 'whatsapp' = 'telegram'): Promise<void> {
  // Re-read alerts after replies so a failed reply can notify in this same run.
  for (const kind of ['reply', 'alert']) {
    const pending = await database.select().from(intakeOutbox).where(and(
      eq(intakeOutbox.conversationId, conversationId), eq(intakeOutbox.kind, kind), eq(intakeOutbox.status, 'pending'),
    ));
    for (const item of pending) {
      const [claim] = await database.update(intakeOutbox).set({ status: 'sending' }).where(and(
        eq(intakeOutbox.id, item.id), eq(intakeOutbox.status, 'pending'),
      )).returning({ id: intakeOutbox.id });
      if (!claim) continue;
      try {
        await database.transaction(async (tx) => {
          // Same lock as intake/control: taking over prevents any later bot send.
          const [conversation] = await tx.select().from(intakeConversations)
            .where(eq(intakeConversations.id, conversationId)).for('update');
          if (!conversation) return;
          const allowedState = item.kind === 'alert' ? conversation.state === 'waiting_human'
            : conversation.state === 'bot' || conversation.state === 'waiting_human';
          const fresh = conversation.lastInboundAt && Date.now() - conversation.lastInboundAt.getTime() < 5 * 60_000
            && Date.now() - item.createdAt.getTime() < 5 * 60_000 && item.createdAt >= cutoff;
          // The webhook must explicitly select its own transport; default remains Telegram.
          if (!allowedState || !fresh || !conversation.lastInboundAt || conversation.channel !== channel
            || (item.kind === 'reply' && item.conversationVersion !== conversation.version)) {
            await tx.update(intakeOutbox).set({ status: 'cancelled' }).where(eq(intakeOutbox.id, item.id));
            return;
          }
          const receipt = await send({
            kind: item.kind, text: item.text, chatId: conversation.chatId,
            accountId: conversation.accountId, conversationId, channel, lastInboundAt: conversation.lastInboundAt,
          });
          await tx.update(intakeOutbox).set({
            status: receipt ? 'accepted' : 'uncertain', receipt, acceptedAt: receipt ? new Date() : null,
          }).where(eq(intakeOutbox.id, item.id));
          if (!receipt) {
            await tx.update(intakeConversations).set({ state: 'waiting_human', reason: 'delivery_uncertain',
              version: conversation.version + 1, updatedAt: new Date() }).where(eq(intakeConversations.id, conversationId));
            if (item.kind === 'reply') await tx.insert(intakeOutbox).values({
              conversationId, messageId: item.messageId, conversationVersion: conversation.version + 1,
              kind: 'alert', text: 'Captación: hay una respuesta cuya entrega no se ha podido confirmar. El asistente está pausado; revisa la conversación antes de continuar.',
            }).onConflictDoNothing();
          }
        });
      } catch (error: unknown) {
        if (error instanceof IntakeSendNotAttempted) {
          // No outbound attempt happened. Let the durable inbox retry, preserving ordering.
          await database.update(intakeOutbox).set({ status: 'pending' }).where(and(
            eq(intakeOutbox.id, item.id), eq(intakeOutbox.status, 'sending'),
          ));
          throw error;
        }
        // A transport exception or failed DB commit can follow a successful send.
        // Persist uncertainty if possible and notify for manual review.
        await database.update(intakeOutbox).set({ status: 'uncertain' }).where(and(
          eq(intakeOutbox.id, item.id), eq(intakeOutbox.status, 'sending'),
        ));
        await database.update(intakeConversations).set({ state: 'waiting_human', reason: 'delivery_uncertain',
          version: sql`${intakeConversations.version} + 1`, updatedAt: new Date() })
          .where(and(eq(intakeConversations.id, conversationId), eq(intakeConversations.state, 'bot')));
        if (item.kind === 'reply') await database.insert(intakeOutbox).values({
          conversationId, messageId: item.messageId, conversationVersion: item.conversationVersion,
          kind: 'alert', text: 'Captación: hay una respuesta cuya entrega no se ha podido confirmar. El asistente está pausado; revisa la conversación antes de continuar.',
        }).onConflictDoNothing();
      }
    }
  }
}
