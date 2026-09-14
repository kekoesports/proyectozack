import { createHash } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { intakeConversations, intakeMessages, intakeOutbox } from '@/db/schema/creatorIntake';
import type { db } from '@/lib/db';
import type { IntakeEvent, IntakeExtraction, IntakeProfile } from '@/lib/schemas/creatorIntake';
import { decideIntake, explicitIntakeIntent } from './decision';
import { intakeAlertSummary } from './summary';
import { INTAKE_INTRO, INTAKE_INTEREST_QUESTION, intakeSimpleReply } from './welcome';

export type IntakeExtractor = (text: string, profile: IntakeProfile, previousAssistantMessage?: string) => Promise<IntakeExtraction | null>;
export type IntakeDatabase = typeof db;
type Transaction = Parameters<Parameters<IntakeDatabase['transaction']>[0]>[0];

async function cancelReplies(tx: Transaction, id: string): Promise<void> {
  const rows = await tx.select({ id: intakeConversations.id }).from(intakeConversations).where(or(
    eq(intakeConversations.id, id), eq(intakeConversations.canonicalId, id),
  ));
  await tx.update(intakeOutbox).set({ status: 'cancelled' }).where(and(
    inArray(intakeOutbox.conversationId, rows.map((row) => row.id)), eq(intakeOutbox.kind, 'reply'), eq(intakeOutbox.status, 'pending'),
  ));
}

export function createIntakeRepository(database: IntakeDatabase) {
  return {
    async ingest(event: IntakeEvent, extract: IntakeExtractor) {
      // Stable, explicit field order makes replay independent of JSON key order.
      const fingerprint = createHash('sha256').update(JSON.stringify([
        event.channel, event.accountId, event.chatId, event.externalId,
        event.actor, event.occurredAt, event.text,
      ])).digest('hex');
      return database.transaction(async (tx) => {
        await tx.insert(intakeConversations).values({
          channel: event.channel, accountId: event.accountId, chatId: event.chatId,
        }).onConflictDoNothing();
        const [conversation] = await tx.select().from(intakeConversations).where(and(
          eq(intakeConversations.channel, event.channel), eq(intakeConversations.accountId, event.accountId),
          eq(intakeConversations.chatId, event.chatId),
        )).for('update');
        if (!conversation) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const linked = await tx.select({ id: intakeConversations.id }).from(intakeConversations).where(or(
          eq(intakeConversations.id, conversation.id), eq(intakeConversations.canonicalId, conversation.id),
        ));
        const historyIds = linked.map((entry) => entry.id);
        // The delivery transaction holds this same lock until its receipt commits.
        // An API echo arriving before HTTP send completes therefore waits here.
        if (event.actor === 'owner' && event.channel === 'whatsapp' && event.accountId.startsWith('waha:')) {
          const [ownReply] = await tx.select({ id: intakeOutbox.id }).from(intakeOutbox).where(and(
            inArray(intakeOutbox.conversationId, historyIds), eq(intakeOutbox.kind, 'reply'),
            eq(intakeOutbox.status, 'accepted'), eq(intakeOutbox.receipt, event.externalId),
          )).limit(1);
          if (ownReply) return { id: conversation.id, duplicate: true };
        }
        const [previous] = await tx.select().from(intakeMessages).where(and(
          inArray(intakeMessages.conversationId, historyIds), eq(intakeMessages.externalId, event.externalId),
        ));
        if (previous) {
          if (previous.text !== event.text || previous.actor !== event.actor
            || previous.occurredAt.getTime() !== Date.parse(event.occurredAt)) throw new TRPCError({ code: 'CONFLICT', message: 'Contradictory event' });
          return { id: conversation.id, duplicate: true };
        }
        const occurredAt = new Date(event.occurredAt);
        const [message] = await tx.insert(intakeMessages).values({
          conversationId: conversation.id, externalId: event.externalId, fingerprint,
          actor: event.actor, text: event.text, occurredAt,
        }).returning();
        if (!message) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const now = new Date();
        const version = conversation.version + 1;
        if (event.actor === 'owner') {
          await cancelReplies(tx, conversation.id);
          await tx.update(intakeConversations).set({ state: conversation.state === 'closed' ? 'closed' : 'human',
            reason: conversation.state === 'closed' ? conversation.reason : 'owner_replied', version, updatedAt: now })
            .where(eq(intakeConversations.id, conversation.id));
          return { id: conversation.id, duplicate: false };
        }
        // Preserve out-of-order messages for review without replying to history.
        if (conversation.lastInboundAt && occurredAt < conversation.lastInboundAt) {
          return { id: conversation.id, duplicate: false };
        }
        const timestamps = { lastInboundAt: occurredAt, updatedAt: now, version };
        const explicitIntent = explicitIntakeIntent(event.text);
        if (explicitIntent?.intent === 'stop') {
          await cancelReplies(tx, conversation.id);
          await tx.update(intakeOutbox).set({ status: 'cancelled' }).where(and(
            eq(intakeOutbox.conversationId, conversation.id), eq(intakeOutbox.status, 'pending'),
          ));
          await tx.update(intakeConversations).set({ ...timestamps, state: 'closed', reason: 'stop_requested' })
            .where(eq(intakeConversations.id, conversation.id));
          return { id: conversation.id, duplicate: false };
        }
        if (conversation.state !== 'bot') {
          await tx.update(intakeConversations).set(timestamps).where(eq(intakeConversations.id, conversation.id));
          return { id: conversation.id, duplicate: false };
        }
        const unresolved = await tx.select({ id: intakeOutbox.id }).from(intakeOutbox).where(and(
          inArray(intakeOutbox.conversationId, historyIds), inArray(intakeOutbox.status, ['sending', 'uncertain']),
        )).limit(1);
        if (unresolved.length) {
          await cancelReplies(tx, conversation.id);
          await tx.update(intakeConversations).set({ ...timestamps, state: 'waiting_human', reason: 'delivery_uncertain' })
            .where(eq(intakeConversations.id, conversation.id));
          return { id: conversation.id, duplicate: false };
        }
        await cancelReplies(tx, conversation.id);
        const [lastReply] = await tx.select({ text: intakeOutbox.text }).from(intakeOutbox).where(and(
          inArray(intakeOutbox.conversationId, historyIds), eq(intakeOutbox.kind, 'reply'), eq(intakeOutbox.status, 'accepted'),
        )).orderBy(desc(intakeOutbox.createdAt)).limit(1);
        const extraction = explicitIntent ?? intakeSimpleReply(event.text, lastReply?.text)
          ?? (event.text.startsWith('[Adjunto recibido; requiere revisión humana]')
            ? { profile: {}, evidence: {}, intent: 'human' as const }
            : conversation.version >= 40 ? null : await extract(event.text, conversation.profile, lastReply?.text).catch(() => null));
        const decision = decideIntake(conversation.profile, extraction);
        await tx.update(intakeConversations).set({
          ...timestamps, profile: decision.profile, state: decision.state,
          qualification: decision.qualification.category, reason: decision.reason,
        }).where(eq(intakeConversations.id, conversation.id));
        if (decision.reply) {
          const intro = conversation.version === 0
            ? INTAKE_INTRO
            : '';
          const text = intro && decision.reply === INTAKE_INTEREST_QUESTION
            ? intro.trimEnd()
            : intro + decision.reply;
          await tx.insert(intakeOutbox).values({
            conversationId: conversation.id, messageId: message.id, conversationVersion: version, kind: 'reply', text,
          });
        }
        if (decision.state === 'waiting_human') {
          await tx.insert(intakeOutbox).values({
            conversationId: conversation.id, messageId: message.id, conversationVersion: version, kind: 'alert',
            text: intakeAlertSummary(decision.profile, decision.qualification.category),
          });
        }
        return { id: conversation.id, duplicate: false };
      });
    },

    async control(id: string, version: number, action: 'take' | 'resume' | 'close', actorId: string) {
      return database.transaction(async (tx) => {
        const [conversation] = await tx.select().from(intakeConversations)
          .where(eq(intakeConversations.id, id)).for('update');
        if (!conversation) return { ok: false, error: 'Conversación no encontrada.' };
        if (conversation.canonicalId) return { ok: false, error: 'Este historial está vinculado a otra conversación. Abre el contacto desde la lista.' };
        if (conversation.version !== version) return { ok: false, error: 'La conversación ha cambiado. Actualiza antes de continuar.' };
        if (conversation.state === 'closed') return { ok: false, error: 'Conversación cerrada. Requiere revisar el consentimiento antes de reabrir.' };
        if (action === 'resume') {
          const history = await tx.select({ id: intakeConversations.id }).from(intakeConversations).where(or(
            eq(intakeConversations.id, id), eq(intakeConversations.canonicalId, id),
          ));
          const uncertain = await tx.select({ id: intakeOutbox.id }).from(intakeOutbox).where(and(
            inArray(intakeOutbox.conversationId, history.map((row) => row.id)), inArray(intakeOutbox.status, ['sending', 'uncertain']),
          )).limit(1);
          if (uncertain.length) return { ok: false, error: 'Hay un envío sin confirmar. Continúa manualmente hasta revisar su entrega.' };
        }
        await cancelReplies(tx, id);
        await tx.update(intakeConversations).set({
          state: action === 'take' ? 'human' : action === 'resume' ? 'bot' : 'closed',
          assignedTo: action === 'resume' ? null : actorId,
          reason: action === 'resume' ? null : 'manual_control', version: version + 1, updatedAt: new Date(),
        }).where(eq(intakeConversations.id, id));
        await tx.insert(intakeMessages).values({
          conversationId: id, externalId: `control:${version + 1}`, fingerprint: 'internal-control',
          actor: 'system', text: action === 'take' ? 'Atención humana activada.'
            : action === 'resume' ? 'Asistente disponible para el próximo mensaje nuevo.' : 'Conversación cerrada.',
          occurredAt: new Date(),
        });
        return { ok: true };
      });
    },

    async list() {
      return database.select().from(intakeConversations).where(isNull(intakeConversations.canonicalId))
        .orderBy(desc(intakeConversations.updatedAt)).limit(100);
    },

    async detail(id: string) {
      const [requested] = await database.select().from(intakeConversations).where(eq(intakeConversations.id, id));
      if (!requested) return null;
      const [conversation] = requested.canonicalId
        ? await database.select().from(intakeConversations).where(eq(intakeConversations.id, requested.canonicalId)) : [requested];
      if (!conversation) return null;
      const linked = await database.select({ id: intakeConversations.id }).from(intakeConversations).where(or(
        eq(intakeConversations.id, conversation.id), eq(intakeConversations.canonicalId, conversation.id),
      ));
      const ids = linked.map((entry) => entry.id);
      const [messages, outbox] = await Promise.all([
        database.select().from(intakeMessages).where(inArray(intakeMessages.conversationId, ids)).orderBy(asc(intakeMessages.occurredAt)),
        database.select().from(intakeOutbox).where(inArray(intakeOutbox.conversationId, ids)).orderBy(asc(intakeOutbox.createdAt)),
      ]);
      return { conversation, messages, outbox };
    },
  };
}
