import { Resend } from 'resend';
import { env } from './env';
import { SITE_URL } from './site-url';

export const resend = new Resend(env.RESEND_API_KEY);

/** Escape user-supplied strings before embedding in HTML email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

type ContactEmailPayload = {
  name: string;
  email: string;
  type: string;
  company?: string | undefined;
  message: string;
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const name = escapeHtml(payload.name);
  const email = escapeHtml(payload.email);
  const type = escapeHtml(payload.type);
  const company = payload.company ? escapeHtml(payload.company) : '';
  const message = escapeHtml(payload.message).replace(/\n/g, '<br/>');

  await resend.emails.send({
    from: 'SocialPro <noreply@socialpro.es>',
    to: 'marketing@socialpro.es',
    subject: `Nuevo contacto: ${name} (${type})`,
    html: `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Tipo:</strong> ${type}</p>
      ${company ? `<p><strong>Empresa:</strong> ${company}</p>` : ''}
      <hr/>
      <p>${message}</p>
    `,
  });
}

export async function sendStaffInviteEmail(payload: {
  staffEmail: string;
  staffName: string;
  loginUrl: string;
}): Promise<void> {
  const staffName = escapeHtml(payload.staffName);
  let loginUrl = '#';
  try {
    const parsed = new URL(payload.loginUrl);
    const siteUrl = new URL(SITE_URL);
    if (parsed.hostname === siteUrl.hostname) loginUrl = payload.loginUrl;
  } catch {
    // Malformed URL — fall through to '#'
  }

  await resend.emails.send({
    from: 'SocialPro <noreply@socialpro.es>',
    to: payload.staffEmail,
    subject: 'Acceso al Panel — SocialPro',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">
          Panel de administración
        </h2>
        <p>Hola <strong>${staffName}</strong>,</p>
        <p>Has sido añadido al equipo de SocialPro. Accede al panel con este enlace y establece tu contraseña usando la opción «¿Olvidaste tu contraseña?».</p>
        <p>
          <a href="${loginUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%);color:#fff;text-decoration:none;border-radius:9999px;font-weight:bold;">
            Acceder al panel
          </a>
        </p>
        <p style="color: #6b6864; font-size: 13px;">Tu email: ${escapeHtml(payload.staffEmail)}</p>
        <p style="color: #6b6864; font-size: 13px;">Si no esperabas este email, puedes ignorarlo.</p>
      </div>
    `,
  });
}

