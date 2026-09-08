import 'server-only';

import { and, asc, desc, eq, inArray, isNotNull, lte, sql } from 'drizzle-orm';

import {
  contactSubmissions,
  creatorApplications,
  creatorOutreachMessages,
  creatorOutreachSources,
  creatorOutreachThreads,
  emailDeliveryEvents,
  emailSuppressions,
  targets,
} from '@/db/schema';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import type {
  CreatorOutreachSourceType,
  CreatorOutreachStatus,
  CreatorReviewDecision,
  ResendReceivedContent,
} from '@/lib/schemas/creator-outreach';
import { creatorReviewDecisionSchema } from '@/lib/schemas/creator-outreach';
import { classifyReply, normalizeEmail, receivedText, suggestedReplyFor, summarizeReply } from '@/lib/email/creatorReplyContent';

export type CreatorOutreachView = {
  readonly status: CreatorOutreachStatus;
  readonly reviewDecision: CreatorReviewDecision | null;
  readonly qualificationReason: string | null;
  readonly internalNotes: string | null;
  readonly lastReplySummary: string | null;
  readonly suggestedReply: string | null;
  readonly lastOutboundAt: Date | null;
  readonly lastInboundAt: Date | null;
  readonly messages: readonly {
    readonly id: number;
    readonly direction: 'inbound' | 'outbound';
    readonly status: string;
    readonly subject: string;
    readonly textBody: string;
    readonly occurredAt: Date;
  }[];
};

function reviewDecisionFor(value: string | null, status: string, legacyReason: string | null): CreatorReviewDecision | null {
  const parsed = creatorReviewDecisionSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return status === 'draft' && legacyReason ? 'yellow' : null;
}

export async function getCreatorOutreachRecipient(
  sourceType: CreatorOutreachSourceType,
  sourceId: number,
): Promise<{ readonly email: string; readonly name: string } | null> {
  if (sourceType === 'target') {
    const [row] = await db.select({ email: targets.contactEmail, name: targets.fullName, username: targets.username })
      .from(targets).where(eq(targets.id, sourceId)).limit(1);
    return row?.email ? { email: row.email, name: row.name?.trim() || row.username } : null;
  }
  if (sourceType === 'creator_application') {
    const [row] = await db.select({ email: creatorApplications.email, name: creatorApplications.name })
      .from(creatorApplications).where(eq(creatorApplications.id, sourceId)).limit(1);
    return row ?? null;
  }
  const [row] = await db.select({ email: contactSubmissions.email, name: contactSubmissions.name })
    .from(contactSubmissions).where(eq(contactSubmissions.id, sourceId)).limit(1);
  return row ?? null;
}

export async function isCreatorEmailSuppressed(normalizedEmail: string): Promise<boolean> {
  const [row] = await db.select({ id: emailSuppressions.id }).from(emailSuppressions)
    .where(eq(emailSuppressions.email, normalizedEmail)).limit(1);
  return Boolean(row);
}

export async function queueCreatorOutreachReview(input: {
  readonly sourceType: CreatorOutreachSourceType;
  readonly sourceId: number;
  readonly reason: string;
}): Promise<void> {
  const recipient = await getCreatorOutreachRecipient(input.sourceType, input.sourceId);
  const normalizedEmail = recipient ? normalizeEmail(recipient.email) : null;
  if (!normalizedEmail) throw new Error('creator-outreach-review-recipient-invalid');
  const now = new Date();
  await db.transaction(async (tx) => {
    const [thread] = await tx.insert(creatorOutreachThreads).values({
      normalizedEmail,
      status: 'draft',
      subject: 'Revisión manual de candidatura',
      reviewDecision: 'yellow',
      qualificationReason: input.reason.slice(0, 500),
      updatedAt: now,
    }).onConflictDoUpdate({
      target: creatorOutreachThreads.normalizedEmail,
      set: {
        status: 'draft',
        subject: 'Revisión manual de candidatura',
        reviewDecision: 'yellow',
        qualificationReason: input.reason.slice(0, 500),
        updatedAt: now,
      },
    }).returning({ id: creatorOutreachThreads.id });
    if (!thread) throw new Error('creator-outreach-review-thread-not-created');
    await attachMatchingSources(tx, thread.id, normalizedEmail, input.sourceType, input.sourceId);
  });
}

export async function recordCreatorOutreachQualification(input: {
  readonly sourceType: CreatorOutreachSourceType;
  readonly sourceId: number;
  readonly decision: CreatorReviewDecision;
  readonly reason: string;
}): Promise<void> {
  const recipient = await getCreatorOutreachRecipient(input.sourceType, input.sourceId);
  const normalizedEmail = recipient ? normalizeEmail(recipient.email) : null;
  if (!normalizedEmail) throw new Error('creator-outreach-review-recipient-invalid');
  const now = new Date();
  await db.transaction(async (tx) => {
    const [thread] = await tx.insert(creatorOutreachThreads).values({
      normalizedEmail,
      status: 'draft',
      subject: 'Revisión de candidatura',
      reviewDecision: input.decision,
      qualificationReason: input.reason.slice(0, 500),
      updatedAt: now,
    }).onConflictDoUpdate({
      target: creatorOutreachThreads.normalizedEmail,
      set: {
        reviewDecision: input.decision,
        qualificationReason: input.reason.slice(0, 500),
        updatedAt: now,
      },
    }).returning({ id: creatorOutreachThreads.id });
    if (!thread) throw new Error('creator-outreach-review-thread-not-created');
    await attachMatchingSources(tx, thread.id, normalizedEmail, input.sourceType, input.sourceId);
  });
}

export async function appendCreatorOutreachNote(input: {
  readonly sourceType: CreatorOutreachSourceType;
  readonly sourceId: number;
  readonly note: string;
  readonly actorLabel: string;
}): Promise<void> {
  const recipient = await getCreatorOutreachRecipient(input.sourceType, input.sourceId);
  const normalizedEmail = recipient ? normalizeEmail(recipient.email) : null;
  if (!normalizedEmail) throw new Error('creator-outreach-note-recipient-invalid');
  const note = input.note.trim().replace(/\s+/g, ' ');
  const entry = `[${new Date().toISOString()}] ${input.actorLabel}: ${note}`;
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(creatorOutreachThreads).values({
      normalizedEmail,
      status: 'draft',
      internalNotes: entry,
    }).onConflictDoNothing({ target: creatorOutreachThreads.normalizedEmail })
      .returning({ id: creatorOutreachThreads.id, internalNotes: creatorOutreachThreads.internalNotes });
    const thread = inserted ?? (await tx.select({
      id: creatorOutreachThreads.id,
      internalNotes: creatorOutreachThreads.internalNotes,
    }).from(creatorOutreachThreads)
      .where(eq(creatorOutreachThreads.normalizedEmail, normalizedEmail)).limit(1))[0];
    if (!thread) throw new Error('creator-outreach-note-thread-not-created');
    if (!inserted) {
      await tx.update(creatorOutreachThreads).set({
        internalNotes: thread.internalNotes ? `${thread.internalNotes}\n${entry}` : entry,
        updatedAt: new Date(),
      }).where(eq(creatorOutreachThreads.id, thread.id));
    }
    await attachMatchingSources(tx, thread.id, normalizedEmail, input.sourceType, input.sourceId);
  });
}

export async function discardCreatorOutreachReview(
  sourceType: CreatorOutreachSourceType,
  sourceId: number,
): Promise<void> {
  const recipient = await getCreatorOutreachRecipient(sourceType, sourceId);
  const normalizedEmail = recipient ? normalizeEmail(recipient.email) : null;
  if (!normalizedEmail) throw new Error('creator-outreach-discard-recipient-invalid');
  await db.transaction(async (tx) => {
    const [thread] = await tx.insert(creatorOutreachThreads).values({
      normalizedEmail,
      status: 'not_interested',
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: creatorOutreachThreads.normalizedEmail,
      set: { status: 'not_interested', nextFollowUpAt: null, updatedAt: new Date() },
    }).returning({ id: creatorOutreachThreads.id });
    if (!thread) throw new Error('creator-outreach-discard-thread-not-created');
    await attachMatchingSources(tx, thread.id, normalizedEmail, sourceType, sourceId);
    if (sourceType === 'contact_submission') {
      await tx.update(contactSubmissions).set({ status: 'descartado' }).where(eq(contactSubmissions.id, sourceId));
    }
  });
}

export async function reserveCreatorOutreach(input: {
  readonly normalizedEmail: string;
  readonly sourceType: CreatorOutreachSourceType;
  readonly sourceId: number;
  readonly subject: string;
  readonly body: string;
  readonly idempotencyKey: string;
  readonly actorId: string | null;
}): Promise<{ readonly threadId: number; readonly replyToken: string; readonly unsubscribeToken: string; readonly messageId: number; readonly providerEmailId: string | null; readonly subject: string; readonly body: string }> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [thread] = await tx.insert(creatorOutreachThreads)
      .values({ normalizedEmail: input.normalizedEmail, subject: input.subject, updatedAt: now })
      .onConflictDoUpdate({
        target: creatorOutreachThreads.normalizedEmail,
        set: { subject: input.subject, updatedAt: now },
      })
      .returning({
        id: creatorOutreachThreads.id,
        replyToken: creatorOutreachThreads.replyToken,
        unsubscribeToken: creatorOutreachThreads.unsubscribeToken,
      });
    if (!thread) throw new Error('creator-outreach-thread-not-created');

    await attachMatchingSources(tx, thread.id, input.normalizedEmail, input.sourceType, input.sourceId);

    const [inserted] = await tx.insert(creatorOutreachMessages).values({
      threadId: thread.id,
      direction: 'outbound',
      status: 'sending',
      idempotencyKey: input.idempotencyKey,
      subject: input.subject,
      textBody: input.body,
      actorId: input.actorId,
      occurredAt: now,
    }).onConflictDoNothing({ target: creatorOutreachMessages.idempotencyKey })
      .returning({ id: creatorOutreachMessages.id, providerEmailId: creatorOutreachMessages.providerEmailId, subject: creatorOutreachMessages.subject, body: creatorOutreachMessages.textBody });

    const message = inserted ?? (await tx.select({
      id: creatorOutreachMessages.id,
      providerEmailId: creatorOutreachMessages.providerEmailId,
      subject: creatorOutreachMessages.subject,
      body: creatorOutreachMessages.textBody,
    }).from(creatorOutreachMessages)
      .where(eq(creatorOutreachMessages.idempotencyKey, input.idempotencyKey)).limit(1))[0];
    if (!message) throw new Error('creator-outreach-message-not-reserved');
    return { threadId: thread.id, replyToken: thread.replyToken, unsubscribeToken: thread.unsubscribeToken, messageId: message.id, providerEmailId: message.providerEmailId, subject: message.subject, body: message.body };
  });
}

export async function completeCreatorOutreach(input: {
  readonly threadId: number;
  readonly messageId: number;
  readonly providerEmailId: string;
}): Promise<void> {
  const now = new Date();
  const nextFollowUpAt = new Date(now.getTime() + env.CREATOR_OUTREACH_NO_RESPONSE_DAYS * 86_400_000);
  await db.transaction(async (tx) => {
    await tx.update(creatorOutreachMessages).set({ status: 'sent', providerEmailId: input.providerEmailId, occurredAt: now })
      .where(eq(creatorOutreachMessages.id, input.messageId));
    // Resend puede entregar y llamar al webhook antes de que su ID termine de
    // asociarse al mensaje. Reconciliar esos eventos ya persistidos evita que
    // un correo entregado se quede para siempre como solo "enviado".
    const deliveryEvents = await tx.select({ type: emailDeliveryEvents.eventType })
      .from(emailDeliveryEvents)
      .where(eq(emailDeliveryEvents.resendEmailId, input.providerEmailId))
      .orderBy(desc(emailDeliveryEvents.eventCreatedAt));
    const delivery = creatorDeliveryState(deliveryEvents.map((event) => event.type));
    if (delivery.message !== 'sent') {
      await tx.update(creatorOutreachMessages).set({ status: delivery.message })
        .where(eq(creatorOutreachMessages.id, input.messageId));
    }
    await tx.update(creatorOutreachThreads).set({
      status: delivery.thread, firstContactAt: sql`coalesce(${creatorOutreachThreads.firstContactAt}, ${now})`,
      lastOutboundAt: now, nextFollowUpAt: delivery.thread === 'delivered' || delivery.thread === 'sent' ? nextFollowUpAt : null, updatedAt: now,
    }).where(eq(creatorOutreachThreads.id, input.threadId));
    const sources = await tx.select().from(creatorOutreachSources).where(eq(creatorOutreachSources.threadId, input.threadId));
    const targetIds = sources.filter((item) => item.sourceType === 'target').map((item) => item.sourceId);
    const leadIds = sources.filter((item) => item.sourceType === 'contact_submission').map((item) => item.sourceId);
    if (targetIds.length > 0) await tx.update(targets).set({ status: 'contactado', contactedAt: sql`coalesce(${targets.contactedAt}, ${now})`, updatedAt: now }).where(inArray(targets.id, targetIds));
    if (leadIds.length > 0) await tx.update(contactSubmissions).set({ status: 'contactado', respondedAt: sql`coalesce(${contactSubmissions.respondedAt}, ${now})` }).where(inArray(contactSubmissions.id, leadIds));
  });
}

export function creatorDeliveryState(eventTypes: readonly string[]): {
  readonly message: 'sent' | 'delivered' | 'failed' | 'complained';
  readonly thread: 'sent' | 'delivered' | 'bounced' | 'complained';
} {
  if (eventTypes.includes('email.complained')) return { message: 'complained', thread: 'complained' };
  if (eventTypes.some((type) => ['email.bounced', 'email.failed', 'email.suppressed'].includes(type))) {
    return { message: 'failed', thread: 'bounced' };
  }
  if (eventTypes.includes('email.delivered')) return { message: 'delivered', thread: 'delivered' };
  return { message: 'sent', thread: 'sent' };
}

/**
 * Cierra la carrera entre la respuesta de Resend, su webhook y la asociación
 * del provider ID. Es idempotente y solo toca mensajes todavía en `sent`.
 */
export async function reconcileCreatorOutreachDeliveryEvents(): Promise<number> {
  const pending = await db.select({
    messageId: creatorOutreachMessages.id,
    threadId: creatorOutreachMessages.threadId,
    providerEmailId: creatorOutreachMessages.providerEmailId,
  }).from(creatorOutreachMessages).where(and(
    eq(creatorOutreachMessages.status, 'sent'),
    isNotNull(creatorOutreachMessages.providerEmailId),
  ));
  let reconciled = 0;
  for (const message of pending) {
    if (!message.providerEmailId) continue;
    const events = await db.select({ type: emailDeliveryEvents.eventType })
      .from(emailDeliveryEvents)
      .where(eq(emailDeliveryEvents.resendEmailId, message.providerEmailId))
      .orderBy(desc(emailDeliveryEvents.eventCreatedAt));
    const delivery = creatorDeliveryState(events.map((event) => event.type));
    if (delivery.message === 'sent') continue;
    await db.transaction(async (tx) => {
      await tx.update(creatorOutreachMessages).set({ status: delivery.message })
        .where(and(eq(creatorOutreachMessages.id, message.messageId), eq(creatorOutreachMessages.status, 'sent')));
      await tx.update(creatorOutreachThreads).set({
        status: delivery.thread,
        nextFollowUpAt: delivery.thread === 'delivered' ? undefined : null,
        updatedAt: new Date(),
      }).where(and(
        eq(creatorOutreachThreads.id, message.threadId),
        inArray(creatorOutreachThreads.status, ['draft', 'sent', 'delivered']),
      ));
    });
    reconciled += 1;
  }
  return reconciled;
}

export async function failCreatorOutreach(messageId: number): Promise<void> {
  await db.update(creatorOutreachMessages).set({ status: 'failed' }).where(eq(creatorOutreachMessages.id, messageId));
}

export async function getCreatorOutreachForSource(
  sourceType: CreatorOutreachSourceType,
  sourceId: number,
): Promise<CreatorOutreachView | null> {
  const [source] = await db.select({ threadId: creatorOutreachSources.threadId }).from(creatorOutreachSources)
    .where(and(eq(creatorOutreachSources.sourceType, sourceType), eq(creatorOutreachSources.sourceId, sourceId))).limit(1);
  if (!source) return null;
  const [thread, messages] = await Promise.all([
    db.select().from(creatorOutreachThreads).where(eq(creatorOutreachThreads.id, source.threadId)).limit(1),
    db.select().from(creatorOutreachMessages).where(eq(creatorOutreachMessages.threadId, source.threadId)).orderBy(asc(creatorOutreachMessages.occurredAt)),
  ]);
  const item = thread[0];
  if (!item) return null;
  return {
    status: item.status as CreatorOutreachStatus,
    reviewDecision: reviewDecisionFor(item.reviewDecision, item.status, item.lastReplySummary),
    qualificationReason: item.qualificationReason ?? (item.status === 'draft' ? item.lastReplySummary : null),
    internalNotes: item.internalNotes,
    lastReplySummary: item.lastReplySummary,
    suggestedReply: item.suggestedReply,
    lastOutboundAt: item.lastOutboundAt,
    lastInboundAt: item.lastInboundAt,
    messages: messages.map((message) => ({
      id: message.id,
      direction: message.direction === 'inbound' ? 'inbound' : 'outbound',
      status: message.status,
      subject: message.subject,
      textBody: message.textBody,
      occurredAt: message.occurredAt,
    })),
  };
}

export async function persistReceivedCreatorEmail(input: {
  readonly svixId: string;
  readonly receivedAt: Date;
  readonly replyToken: string;
  readonly senderEmail: string;
  readonly content: ResendReceivedContent;
}): Promise<{ readonly duplicate: boolean; readonly matched: boolean; readonly status?: CreatorOutreachStatus }> {
  return db.transaction(async (tx) => {
    const [thread] = await tx.select().from(creatorOutreachThreads)
      .where(eq(creatorOutreachThreads.replyToken, input.replyToken)).limit(1);
    const [event] = await tx.insert(emailDeliveryEvents).values({
      svixId: input.svixId,
      resendEmailId: input.content.id,
      eventType: 'email.received',
      eventCreatedAt: input.receivedAt,
    }).onConflictDoNothing({ target: emailDeliveryEvents.svixId }).returning({ id: emailDeliveryEvents.id });
    if (!event) return { duplicate: true, matched: Boolean(thread) };
    if (!thread || thread.normalizedEmail !== input.senderEmail) return { duplicate: false, matched: false };

    const body = receivedText(input.content.text, input.content.html);
    const status = classifyReply(body);
    const summary = summarizeReply(body);
    const suggestedReply = suggestedReplyFor(status);
    await tx.insert(creatorOutreachMessages).values({
      threadId: thread.id,
      direction: 'inbound',
      status: 'received',
      providerEmailId: input.content.id,
      internetMessageId: input.content.message_id ?? null,
      subject: (input.content.subject ?? 'Sin asunto').slice(0, 200),
      textBody: body,
      occurredAt: input.receivedAt,
    }).onConflictDoNothing({ target: creatorOutreachMessages.providerEmailId });
    await tx.update(creatorOutreachThreads).set({
      status, lastInboundAt: input.receivedAt, nextFollowUpAt: null,
      lastReplySummary: summary, suggestedReply, updatedAt: new Date(),
    }).where(eq(creatorOutreachThreads.id, thread.id));
    if (status === 'unsubscribed') {
      await tx.insert(emailSuppressions).values({
        email: thread.normalizedEmail, reason: 'unsubscribe', sourceEmailId: input.content.id,
      }).onConflictDoNothing({ target: emailSuppressions.email });
    }
    return { duplicate: false, matched: true, status };
  });
}

export async function markCreatorOutreachNoResponse(now = new Date()): Promise<number> {
  const rows = await db.update(creatorOutreachThreads).set({ status: 'no_response', updatedAt: now })
    .where(and(inArray(creatorOutreachThreads.status, ['sent', 'delivered']), lte(creatorOutreachThreads.nextFollowUpAt, now)))
    .returning({ id: creatorOutreachThreads.id });
  return rows.length;
}

export async function unsubscribeCreatorOutreach(token: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [thread] = await tx.update(creatorOutreachThreads)
      .set({ status: 'unsubscribed', nextFollowUpAt: null, suggestedReply: null, updatedAt: new Date() })
      .where(eq(creatorOutreachThreads.unsubscribeToken, token))
      .returning({ email: creatorOutreachThreads.normalizedEmail, id: creatorOutreachThreads.id });
    if (!thread) return false;
    await tx.insert(emailSuppressions).values({
      email: thread.email,
      reason: 'unsubscribe',
      sourceEmailId: `outreach-unsubscribe-${thread.id}`,
    }).onConflictDoNothing({ target: emailSuppressions.email });
    return true;
  });
}

async function attachMatchingSources(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  threadId: number,
  email: string,
  requestedType: CreatorOutreachSourceType,
  requestedId: number,
): Promise<void> {
  const [targetRows, applicationRows, leadRows] = await Promise.all([
    tx.select({ id: targets.id }).from(targets).where(sql`lower(trim(${targets.contactEmail})) = ${email}`),
    tx.select({ id: creatorApplications.id }).from(creatorApplications).where(sql`lower(trim(${creatorApplications.email})) = ${email}`),
    tx.select({ id: contactSubmissions.id }).from(contactSubmissions).where(sql`lower(trim(${contactSubmissions.email})) = ${email}`),
  ]);
  const values = [
    ...targetRows.map((row) => ({ threadId, sourceType: 'target', sourceId: row.id })),
    ...applicationRows.map((row) => ({ threadId, sourceType: 'creator_application', sourceId: row.id })),
    ...leadRows.map((row) => ({ threadId, sourceType: 'contact_submission', sourceId: row.id })),
    { threadId, sourceType: requestedType, sourceId: requestedId },
  ];
  const uniqueValues = [...new Map(values.map((value) => [`${value.sourceType}:${value.sourceId}`, value])).values()];
  await tx.insert(creatorOutreachSources).values(uniqueValues).onConflictDoUpdate({
    target: [creatorOutreachSources.sourceType, creatorOutreachSources.sourceId],
    set: { threadId },
  });
}

export { normalizeEmail };
