import { db } from '@/lib/db';
import { creatorOutreachMessages, creatorOutreachThreads, emailDeliveryEvents, emailSuppressions } from '@/db/schema';
import type { ResendEmailWebhookEvent } from '@/lib/schemas/resend-webhook';
import { and, eq, inArray } from 'drizzle-orm';

export type SuppressionReason = 'complaint' | 'permanent_bounce' | 'provider_suppressed';

export function suppressionReasonForEvent(
  event: ResendEmailWebhookEvent,
): SuppressionReason | null {
  if (event.type === 'email.complained') return 'complaint';
  if (event.type === 'email.suppressed') return 'provider_suppressed';
  if (
    event.type === 'email.bounced'
    && event.data.bounce?.type.trim().toLowerCase() === 'permanent'
  ) {
    return 'permanent_bounce';
  }
  return null;
}

export async function persistResendWebhookEvent(
  svixId: string,
  event: ResendEmailWebhookEvent,
): Promise<{ duplicate: boolean; suppressed: number }> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(emailDeliveryEvents)
      .values({
        svixId,
        resendEmailId: event.data.email_id,
        eventType: event.type,
        eventCreatedAt: new Date(event.created_at),
      })
      .onConflictDoNothing({ target: emailDeliveryEvents.svixId })
      .returning({ id: emailDeliveryEvents.id });

    if (inserted.length === 0) return { duplicate: true, suppressed: 0 };

    const outreachStatus = outreachStatusForEvent(event);
    if (outreachStatus) {
      const [message] = await tx.update(creatorOutreachMessages)
        .set({ status: outreachStatus.message })
        .where(eq(creatorOutreachMessages.providerEmailId, event.data.email_id))
        .returning({ threadId: creatorOutreachMessages.threadId });
      if (message) {
        await tx.update(creatorOutreachThreads)
          .set({ status: outreachStatus.thread, updatedAt: new Date() })
          .where(and(
            eq(creatorOutreachThreads.id, message.threadId),
            inArray(creatorOutreachThreads.status, ['draft', 'sent', 'delivered']),
          ));
      }
    }

    const reason = suppressionReasonForEvent(event);
    if (!reason) return { duplicate: false, suppressed: 0 };

    let suppressed = 0;
    const recipients = [...new Set(event.data.to.map((email) => email.trim().toLowerCase()))];
    for (const email of recipients) {
      const rows = await tx
        .insert(emailSuppressions)
        .values({ email, reason, sourceEmailId: event.data.email_id })
        // Una supresión nunca se desactiva ni rebaja por la llegada tardía de
        // otro evento. La revisión y retirada debe ser una acción humana.
        .onConflictDoNothing({ target: emailSuppressions.email })
        .returning({ id: emailSuppressions.id });
      suppressed += rows.length;
    }

    return { duplicate: false, suppressed };
  });
}

function outreachStatusForEvent(event: ResendEmailWebhookEvent): {
  readonly message: string;
  readonly thread: string;
} | null {
  if (event.type === 'email.delivered') return { message: 'delivered', thread: 'delivered' };
  if (event.type === 'email.bounced' || event.type === 'email.failed' || event.type === 'email.suppressed') {
    return { message: 'failed', thread: 'bounced' };
  }
  if (event.type === 'email.complained') return { message: 'complained', thread: 'complained' };
  return null;
}
