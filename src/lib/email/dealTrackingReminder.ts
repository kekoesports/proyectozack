import { OPERATIONAL_EMAIL_FROM, OPERATIONAL_GOOGLE_EMAIL } from '@/lib/constants/operational-email';
import { sendResendEmail } from '@/lib/email/sendResendEmail';

export async function sendDealTrackingReminderEmail(input: {
  readonly to: string;
  readonly talentName: string;
  readonly brandName: string;
  readonly trackingSheetUrl: string;
  readonly inactiveDays: number;
  readonly idempotencyKey: string;
}): Promise<string> {
  const safeTalent = escapeHtml(input.talentName);
  const safeBrand = escapeHtml(input.brandName);
  const safeUrl = escapeHtml(input.trackingSheetUrl);
  const subject = `Actualiza el seguimiento de ${input.brandName} en SocialPro`;
  const text = [
    `Hola ${input.talentName},`,
    '',
    `Hace ${input.inactiveDays} días que no detectamos contenido nuevo en el seguimiento del acuerdo con ${input.brandName}.`,
    'Por favor, añade al documento los enlaces del contenido que ya hayas publicado.',
    '',
    input.trackingSheetUrl,
    '',
    'Si todavía no hay contenido nuevo, no necesitas responder a este correo.',
    '',
    'Pablo Camacho',
    'SocialPro',
  ].join('\n');

  return sendResendEmail(
    'sendDealTrackingReminderEmail',
    {
      from: OPERATIONAL_EMAIL_FROM,
      to: input.to,
      replyTo: OPERATIONAL_GOOGLE_EMAIL,
      subject,
      text,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:620px;color:#171717;line-height:1.6;">
          <p>Hola ${safeTalent},</p>
          <p>
            Hace <strong>${input.inactiveDays} días</strong> que no detectamos contenido nuevo
            en el seguimiento del acuerdo con <strong>${safeBrand}</strong>.
          </p>
          <p>Por favor, añade al documento los enlaces del contenido que ya hayas publicado.</p>
          <p style="margin:24px 0;">
            <a href="${safeUrl}" style="display:inline-block;background:#5b4df7;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600;">
              Actualizar documento
            </a>
          </p>
          <p style="font-size:13px;color:#6b6864;">
            Si todavía no hay contenido nuevo, no necesitas responder a este correo.
          </p>
          <p style="margin-top:28px;color:#6b6864;font-size:13px;">
            Pablo Camacho<br/>SocialPro
          </p>
        </div>
      `,
    },
    { idempotencyKey: input.idempotencyKey },
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
