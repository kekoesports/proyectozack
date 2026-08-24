import { OPERATIONAL_EMAIL_FROM, OPERATIONAL_GOOGLE_EMAIL } from '@/lib/constants/operational-email';
import { sendResendEmail } from '@/lib/email/sendResendEmail';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function sendLeadReplyEmail(input: {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly idempotencyKey: string;
}): Promise<string> {
  const safeBody = escapeHtml(input.body).replace(/\n/g, '<br/>');

  return sendResendEmail(
    'sendLeadReplyEmail',
    {
      from: OPERATIONAL_EMAIL_FROM,
      to: input.to,
      replyTo: OPERATIONAL_GOOGLE_EMAIL,
      subject: input.subject,
      text: input.body,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:620px;color:#171717;line-height:1.6;">
          <div>${safeBody}</div>
          <p style="margin-top:28px;color:#6b6864;font-size:13px;">
            Pablo Camacho<br/>SocialPro
          </p>
        </div>
      `,
    },
    { idempotencyKey: input.idempotencyKey },
  );
}
