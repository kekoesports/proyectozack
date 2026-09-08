import 'server-only';

import { OPERATIONAL_EMAIL_FROM, OPERATIONAL_GOOGLE_EMAIL } from '@/lib/constants/operational-email';
import { env } from '@/lib/env';
import { sendResendEmail } from '@/lib/email/sendResendEmail';
import {
  completeCreatorOutreach,
  failCreatorOutreach,
  getCreatorOutreachRecipient,
  isCreatorEmailSuppressed,
  normalizeEmail,
  reserveCreatorOutreach,
} from '@/lib/queries/creatorOutreach';
import type { SendCreatorOutreachInput } from '@/lib/schemas/creator-outreach';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

export class CreatorOutreachError extends Error {
  constructor(readonly code: 'not_found' | 'invalid_email' | 'suppressed' | 'send_failed') {
    super(code);
    this.name = 'CreatorOutreachError';
  }
}

export async function sendCreatorOutreach(
  input: SendCreatorOutreachInput,
  actorId: string,
): Promise<{ readonly providerEmailId: string; readonly duplicate: boolean; readonly replyTracking: boolean }> {
  const domain = env.CREATOR_REPLY_RECEIVING_DOMAIN;

  const recipient = await getCreatorOutreachRecipient(input.sourceType, input.sourceId);
  if (!recipient) throw new CreatorOutreachError('not_found');
  const normalizedEmail = normalizeEmail(recipient.email);
  if (!normalizedEmail) throw new CreatorOutreachError('invalid_email');
  if (await isCreatorEmailSuppressed(normalizedEmail)) throw new CreatorOutreachError('suppressed');

  const reservation = await reserveCreatorOutreach({
    normalizedEmail,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    subject: input.subject,
    body: input.body,
    idempotencyKey: input.idempotencyKey,
    actorId,
  });
  if (reservation.providerEmailId) {
    return { providerEmailId: reservation.providerEmailId, duplicate: true, replyTracking: Boolean(domain) };
  }

  const replyTo = domain ? `creator-${reservation.replyToken}@${domain}` : OPERATIONAL_GOOGLE_EMAIL;
  const unsubscribeUrl = new URL(`/api/creator-outreach/unsubscribe/${reservation.unsubscribeToken}`, env.NEXT_PUBLIC_SITE_URL).toString();
  const safeBody = escapeHtml(reservation.body).replace(/\n/g, '<br/>');
  try {
    const providerEmailId = await sendResendEmail('sendCreatorOutreach', {
      from: OPERATIONAL_EMAIL_FROM,
      to: normalizedEmail,
      replyTo,
      subject: reservation.subject,
      text: `${reservation.body}\n\nSi no quieres recibir más mensajes sobre colaboraciones: ${unsubscribeUrl}`,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:620px;color:#171717;line-height:1.6">
        <div>${safeBody}</div>
        <p style="margin-top:28px;color:#6b6864;font-size:13px">Pablo Camacho<br/>SocialPro</p>
        <p style="margin-top:20px;font-size:11px;color:#777"><a href="${escapeHtml(unsubscribeUrl)}">No recibir más mensajes</a></p>
      </div>`,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }, { idempotencyKey: input.idempotencyKey });
    await completeCreatorOutreach({
      threadId: reservation.threadId,
      messageId: reservation.messageId,
      providerEmailId,
    });
    return { providerEmailId, duplicate: false, replyTracking: Boolean(domain) };
  } catch (error) {
    await failCreatorOutreach(reservation.messageId).catch(() => undefined);
    if (error instanceof CreatorOutreachError) throw error;
    throw new CreatorOutreachError('send_failed');
  }
}
