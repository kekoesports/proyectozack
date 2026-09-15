import 'server-only';

import { and, eq, inArray, or, sql } from 'drizzle-orm';

import {
  contactSubmissions,
  creatorApplications,
  creatorOutreachMessages,
  creatorOutreachSources,
  creatorOutreachThreads,
  targets,
} from '@/db/schema';
import { OPERATIONAL_GOOGLE_EMAIL } from '@/lib/constants/operational-email';
import { db } from '@/lib/db';
import { normalizeEmail } from '@/lib/email/creatorReplyContent';
import { env } from '@/lib/env';
import type { GmailSentMessage } from '@/lib/schemas/creator-outreach';

type SourceLink = {
  readonly sourceType: 'target' | 'creator_application' | 'contact_submission';
  readonly sourceId: number;
};

type GmailMatchResult = {
  readonly duplicate: boolean;
  readonly matched: boolean;
  readonly reason?: 'sender' | 'recipient' | 'ambiguous';
};

export function gmailRecipientEmails(input: {
  readonly from: string;
  readonly to: readonly string[];
  readonly cc: readonly string[];
  readonly bcc: readonly string[];
}): string[] {
  if (normalizeEmail(input.from) !== OPERATIONAL_GOOGLE_EMAIL) return [];
  const recipients = [...input.to, ...input.cc, ...input.bcc]
    .map(normalizeEmail)
    .filter((email): email is string => email !== null && email !== OPERATIONAL_GOOGLE_EMAIL);
  return [...new Set(recipients)];
}

export async function persistGmailSentCreatorEmail(input: GmailSentMessage): Promise<GmailMatchResult> {
  const recipients = gmailRecipientEmails(input);
  if (recipients.length === 0) return { duplicate: false, matched: false, reason: 'sender' };

  const [targetRows, applicationRows, leadRows] = await Promise.all([
    db.select({ id: targets.id, email: targets.contactEmail }).from(targets)
      .where(or(...recipients.map((email) => sql`lower(trim(${targets.contactEmail})) = ${email}`))),
    db.select({ id: creatorApplications.id, email: creatorApplications.email }).from(creatorApplications)
      .where(or(...recipients.map((email) => sql`lower(trim(${creatorApplications.email})) = ${email}`))),
    db.select({ id: contactSubmissions.id, email: contactSubmissions.email }).from(contactSubmissions)
      .where(or(...recipients.map((email) => sql`lower(trim(${contactSubmissions.email})) = ${email}`))),
  ]);

  const matchedEmails = new Set(
    [...targetRows, ...applicationRows, ...leadRows]
      .map((row) => row.email ? normalizeEmail(row.email) : null)
      .filter((email): email is string => email !== null),
  );
  if (matchedEmails.size === 0) return { duplicate: false, matched: false, reason: 'recipient' };
  if (matchedEmails.size > 1) return { duplicate: false, matched: false, reason: 'ambiguous' };

  const normalizedEmail = [...matchedEmails][0];
  if (!normalizedEmail) return { duplicate: false, matched: false, reason: 'recipient' };
  const sources: SourceLink[] = [
    ...targetRows.filter((row) => normalizeEmail(row.email ?? '') === normalizedEmail)
      .map((row) => ({ sourceType: 'target' as const, sourceId: row.id })),
    ...applicationRows.filter((row) => normalizeEmail(row.email) === normalizedEmail)
      .map((row) => ({ sourceType: 'creator_application' as const, sourceId: row.id })),
    ...leadRows.filter((row) => normalizeEmail(row.email) === normalizedEmail)
      .map((row) => ({ sourceType: 'contact_submission' as const, sourceId: row.id })),
  ];

  return db.transaction(async (tx) => {
    const providerEmailId = `gmail:${input.gmailId}`;
    const [existing] = await tx.select({ id: creatorOutreachMessages.id })
      .from(creatorOutreachMessages)
      .where(eq(creatorOutreachMessages.providerEmailId, providerEmailId))
      .limit(1);
    if (existing) return { duplicate: true, matched: true };

    const sentAt = new Date(input.sentAt);
    const [thread] = await tx.insert(creatorOutreachThreads).values({
      normalizedEmail,
      subject: input.subject,
      updatedAt: sentAt,
    }).onConflictDoUpdate({
      target: creatorOutreachThreads.normalizedEmail,
      set: { subject: input.subject, updatedAt: sentAt },
    }).returning({ id: creatorOutreachThreads.id, status: creatorOutreachThreads.status });
    if (!thread) throw new Error('gmail-sent-thread-not-created');

    await attachSources(tx, thread.id, sources);
    const [message] = await tx.insert(creatorOutreachMessages).values({
      threadId: thread.id,
      direction: 'outbound',
      status: 'sent',
      providerEmailId,
      internetMessageId: input.messageId,
      subject: input.subject,
      textBody: input.text,
      occurredAt: sentAt,
    }).onConflictDoNothing({ target: creatorOutreachMessages.providerEmailId })
      .returning({ id: creatorOutreachMessages.id });
    if (!message) return { duplicate: true, matched: true };

    const protectedStatus = thread.status === 'unsubscribed' || thread.status === 'complained';
    if (!protectedStatus) {
      const nextFollowUpAt = new Date(sentAt.getTime() + env.CREATOR_OUTREACH_NO_RESPONSE_DAYS * 86_400_000);
      await tx.update(creatorOutreachThreads).set({
        status: 'sent',
        firstContactAt: sql`coalesce(${creatorOutreachThreads.firstContactAt}, ${sentAt})`,
        lastOutboundAt: sentAt,
        nextFollowUpAt,
        updatedAt: sentAt,
      }).where(eq(creatorOutreachThreads.id, thread.id));
    }

    const targetIds = sources.filter((source) => source.sourceType === 'target').map((source) => source.sourceId);
    const leadIds = sources.filter((source) => source.sourceType === 'contact_submission').map((source) => source.sourceId);
    if (targetIds.length > 0) {
      await tx.update(targets).set({ status: 'contactado', contactedAt: sentAt, updatedAt: sentAt })
        .where(and(inArray(targets.id, targetIds), eq(targets.status, 'pendiente')));
    }
    if (leadIds.length > 0) {
      const note = `[${sentAt.toISOString()}] Gmail: Email enviado directamente desde ${OPERATIONAL_GOOGLE_EMAIL} · Asunto: ${input.subject} [email:${providerEmailId}]`;
      await tx.update(contactSubmissions).set({
        status: 'contactado',
        respondedAt: sentAt,
        notes: sql`concat_ws(E'\n', nullif(trim(coalesce(${contactSubmissions.notes}, '')), ''), ${note})`,
      }).where(and(inArray(contactSubmissions.id, leadIds), inArray(contactSubmissions.status, ['nuevo', 'interesante'])));
    }
    return { duplicate: false, matched: true };
  });
}

async function attachSources(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  threadId: number,
  sources: readonly SourceLink[],
): Promise<void> {
  if (sources.length === 0) return;
  await tx.insert(creatorOutreachSources).values(
    sources.map((source) => ({ threadId, ...source })),
  ).onConflictDoUpdate({
    target: [creatorOutreachSources.sourceType, creatorOutreachSources.sourceId],
    set: { threadId },
  });
}
