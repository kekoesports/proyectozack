import { Resend } from 'resend';
import { env } from './env';
import { SITE_URL, absoluteUrl } from './site-url';
import { buildWelcomeEmail, buildNewsletterEmail } from './email/newsletterTemplates';

const resend = new Resend(env.RESEND_API_KEY);
const SITE_HOSTNAME = new URL(SITE_URL).hostname;

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
  phone?: string | undefined;
  type: string;
  company?: string | undefined;
  message: string;
  // Brand-specific
  budget?: string | undefined;
  timeline?: string | undefined;
  audience?: string | undefined;
  vertical?: string | undefined;
  campaignType?: string | undefined;
  // Creator-specific
  platform?: string | undefined;
  viewers?: string | undefined;
  monetization?: string | undefined;
}

function row(label: string, value: string | undefined): string {
  if (!value) return '';
  return `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`;
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const name = escapeHtml(payload.name);
  const email = escapeHtml(payload.email);
  const type = escapeHtml(payload.type);
  const message = escapeHtml(payload.message).replace(/\n/g, '<br/>');

  const isBrand = payload.type === 'brand';
  const isCreator = payload.type === 'talent';

  const brandSection = isBrand ? `
    <h3 style="margin:16px 0 8px; color:#f5632a;">Datos de campaña</h3>
    ${row('Vertical', payload.vertical)}
    ${row('Tipo de campaña', payload.campaignType)}
    ${row('Presupuesto', payload.budget)}
    ${row('Timeline', payload.timeline)}
    ${row('Público objetivo', payload.audience)}
  ` : '';

  const creatorSection = isCreator ? `
    <h3 style="margin:16px 0 8px; color:#f5632a;">Datos del canal</h3>
    ${row('Plataforma', payload.platform)}
    ${row('Viewers / Suscriptores', payload.viewers)}
    ${row('Monetización', payload.monetization)}
  ` : '';

  await resend.emails.send({
    from: 'SocialPro <noreply@socialpro.es>',
    to: 'marketing@socialpro.es',
    subject: `Nuevo contacto: ${name} (${type})`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;">
        <h2 style="font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;">
          Nuevo contacto
        </h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${row('Teléfono', payload.phone)}
        <p><strong>Tipo:</strong> ${type}</p>
        ${row('Empresa', payload.company)}
        ${brandSection}
        ${creatorSection}
        <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;"/>
        <h3 style="margin:0 0 8px;">Mensaje</h3>
        <p style="white-space:pre-wrap;">${message}</p>
      </div>
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
    if (parsed.hostname === SITE_HOSTNAME) loginUrl = payload.loginUrl;
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

export async function sendPasswordResetEmail(payload: {
  email: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  const name = escapeHtml(payload.name);
  let resetUrl = '#';
  try {
    const parsed = new URL(payload.resetUrl);
    if (parsed.hostname === SITE_HOSTNAME) resetUrl = payload.resetUrl;
  } catch { /* fall through */ }

  await resend.emails.send({
    from: 'SocialPro <noreply@socialpro.es>',
    to: payload.email,
    subject: 'Restablecer contraseña — SocialPro',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">
          Restablecer contraseña
        </h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Haz clic en el botón para establecer tu contraseña. El enlace caduca en 1 hora.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%);color:#fff;text-decoration:none;border-radius:9999px;font-weight:bold;">
            Establecer contraseña
          </a>
        </p>
        <p style="color: #6b6864; font-size: 13px;">Si no solicitaste este cambio, ignora este email.</p>
      </div>
    `,
  });
}

export async function sendNewsletterWelcomeEmail(payload: {
  email: string;
  unsubscribeToken: string;
}): Promise<void> {
  const unsubUrl = absoluteUrl(`/unsubscribe?token=${encodeURIComponent(payload.unsubscribeToken)}`);
  await resend.emails.send({
    from:    'SocialPro News <noreply@socialpro.es>',
    to:      payload.email,
    subject: 'Bienvenido al newsletter de SocialPro News',
    html:    buildWelcomeEmail(payload.unsubscribeToken),
    headers: {
      'List-Unsubscribe':      `<${unsubUrl}>, <mailto:noreply@socialpro.es?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

export async function sendNewsletterPostEmail(payload: {
  email:        string;
  unsubToken:   string;
  postTitle:    string;
  postExcerpt:  string;
  postSlug:     string;
  coverUrl?:    string | null | undefined;
  author:       string;
}): Promise<void> {
  const postUrl  = absoluteUrl(`/news/${payload.postSlug}`);
  const unsubUrl = absoluteUrl(`/unsubscribe?token=${encodeURIComponent(payload.unsubToken)}`);
  await resend.emails.send({
    from:    'SocialPro News <noreply@socialpro.es>',
    to:      payload.email,
    subject: payload.postTitle,
    html:    buildNewsletterEmail({
      postTitle:   payload.postTitle,
      postExcerpt: payload.postExcerpt,
      postUrl,
      coverUrl:    payload.coverUrl,
      author:      payload.author,
      unsubToken:  payload.unsubToken,
    }),
    headers: {
      'List-Unsubscribe':      `<${unsubUrl}>, <mailto:noreply@socialpro.es?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

export async function sendBrandInviteEmail(payload: {
  brandEmail: string;
  brandName: string;
  resetUrl: string;
}): Promise<void> {
  const brandName = escapeHtml(payload.brandName);
  // Only allow URLs on the same domain to prevent phishing via open redirect
  let resetUrl = '#';
  try {
    const parsed = new URL(payload.resetUrl);
    if (parsed.hostname === SITE_HOSTNAME) resetUrl = payload.resetUrl;
  } catch {
    // Malformed URL — fall through to '#'
  }

  await resend.emails.send({
    from: 'SocialPro <noreply@socialpro.es>',
    to: payload.brandEmail,
    subject: 'Bienvenido al Portal de Marcas — SocialPro',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">
          Portal de Marcas
        </h2>
        <p>Hola <strong>${brandName}</strong>,</p>
        <p>Has sido invitado al Portal de Marcas de SocialPro. Accede a nuestro roster de talentos, revisa metricas de campanas y envia propuestas directamente.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%);color:#fff;text-decoration:none;border-radius:9999px;font-weight:bold;">
            Establecer contrasena
          </a>
        </p>
        <p style="color: #6b6864; font-size: 13px;">Si no esperabas este email, puedes ignorarlo.</p>
      </div>
    `,
  });
}
