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

export async function sendInvoiceEmail(payload: {
  clientEmail:   string;
  clientName:    string;
  issuerName:    string;
  issuerEmail?:  string | null | undefined;
  invoiceNumber: string;
  totalAmount:   string;
  currency:      string;
  issueDate:     string;
  dueDate?:      string | null | undefined;
  paymentTerms?: string | null | undefined;
  bankDetails?:  string | null | undefined;
  legalNote?:    string | null | undefined;
}): Promise<void> {
  const clientName    = escapeHtml(payload.clientName);
  const issuerName    = escapeHtml(payload.issuerName);
  const invoiceNumber = escapeHtml(payload.invoiceNumber);
  const currency      = ['EUR', 'USD', 'GBP', 'CHF'].includes(payload.currency) ? payload.currency : 'EUR';
  const total         = new Intl.NumberFormat('es-ES', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(Number(payload.totalAmount));
  const issueDateFmt  = payload.issueDate
    ? new Date(payload.issueDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';
  const dueDateFmt    = payload.dueDate
    ? new Date(payload.dueDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const bankSection = payload.bankDetails
    ? `<div style="margin:16px 0;padding:12px 16px;background:#f8f8fc;border-radius:8px;border-left:3px solid #f5632a;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#72728a;letter-spacing:0.1em;">Datos de pago</p>
        <pre style="margin:0;font-size:12px;color:#16161f;font-family:monospace;white-space:pre-wrap;">${escapeHtml(payload.bankDetails)}</pre>
       </div>`
    : '';

  const termsSection = payload.paymentTerms
    ? `<p style="font-size:13px;color:#72728a;">${escapeHtml(payload.paymentTerms)}</p>`
    : '';

  const legalSection = payload.legalNote
    ? `<hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;"/>
       <p style="font-size:11px;color:#9ca3af;white-space:pre-wrap;">${escapeHtml(payload.legalNote)}</p>`
    : '';

  const replyTo = payload.issuerEmail ? [payload.issuerEmail] : undefined;

  await resend.emails.send({
    from:    `${issuerName} <noreply@socialpro.es>`,
    to:      payload.clientEmail,
    ...(replyTo && { replyTo }),
    subject: `Factura ${invoiceNumber} — ${issuerName}`,
    html: `
      <div style="font-family:Inter,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#16161f;">
        <div style="height:4px;background:linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%);border-radius:2px 2px 0 0;"></div>
        <div style="padding:32px 32px 24px;">
          <h1 style="margin:0 0 4px;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;color:#16161f;">${issuerName}</h1>
          <p style="margin:0;font-size:13px;color:#72728a;">Factura adjunta para tu revisión</p>

          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>

          <p style="font-size:14px;margin:0 0 16px;">Estimado/a <strong>${clientName}</strong>,</p>
          <p style="font-size:14px;margin:0 0 24px;color:#4b5563;">
            Te enviamos la factura <strong style="color:#f5632a;">${invoiceNumber}</strong>
            con fecha de emisión ${issueDateFmt}${dueDateFmt ? ` y vencimiento el <strong>${dueDateFmt}</strong>` : ''}.
          </p>

          <div style="padding:20px 24px;background:#f5f5f7;border-radius:12px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#72728a;letter-spacing:0.1em;">Total a pagar</p>
            <p style="margin:0;font-size:32px;font-weight:900;color:#f5632a;">${total}</p>
            ${dueDateFmt ? `<p style="margin:6px 0 0;font-size:12px;color:#6b7280;">Vencimiento: ${dueDateFmt}</p>` : ''}
          </div>

          ${termsSection}
          ${bankSection}
          ${legalSection}

          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
          <p style="font-size:12px;color:#9ca3af;margin:0;">
            Para cualquier consulta responde a este email${payload.issuerEmail ? ` o escríbenos a <a href="mailto:${escapeHtml(payload.issuerEmail)}" style="color:#f5632a;">${escapeHtml(payload.issuerEmail)}</a>` : ''}.
          </p>
        </div>
        <div style="padding:12px 32px;background:#1e2235;text-align:center;">
          <p style="margin:0;font-size:11px;color:#8888a8;">${issuerName}</p>
        </div>
      </div>
    `,
  });
}

/**
 * Notifica al equipo interno que un usuario ha canjeado una recompensa que
 * requiere envío/revisión manual (típicamente skins CS2 vía Steam Trade
 * Offer). Se dispara desde `redeemShopItem` en fire-and-forget — si el
 * email falla no revierte el canje. Los datos sensibles (Steam Trade URL,
 * email) NO se loguean, se envían directo por Resend.
 */
export async function sendRewardRedemptionEmail(payload: {
  redemptionId: number;
  rewardName: string;
  rewardCategory: string;
  costPoints: number;
  userEmail: string | null;
  steamName: string | null;
  steamId: string | null;
  steamTradeUrl: string | null;
  createdAtIso: string;
}): Promise<void> {
  const name = escapeHtml(payload.rewardName);
  const category = escapeHtml(payload.rewardCategory);
  const userEmail = payload.userEmail ? escapeHtml(payload.userEmail) : '—';
  const steamName = payload.steamName ? escapeHtml(payload.steamName) : '—';
  const steamId = payload.steamId ? escapeHtml(payload.steamId) : '—';
  const tradeUrl = payload.steamTradeUrl ? escapeHtml(payload.steamTradeUrl) : '—';
  const subject = payload.rewardCategory === 'skin'
    ? `Nueva recompensa solicitada · Skin CS2 — ${payload.rewardName}`
    : `Nueva recompensa solicitada — ${payload.rewardName}`;

  await resend.emails.send({
    from: 'SocialPro Giveaways <noreply@socialpro.es>',
    to: 'info@socialpro.es',
    subject,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;color:#16161f;">
        <h2 style="font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;">
          Nueva recompensa solicitada
        </h2>
        <p><strong>Recompensa:</strong> ${name}</p>
        <p><strong>Categoría:</strong> ${category}</p>
        <p><strong>Precio en puntos:</strong> ${payload.costPoints.toLocaleString('es-ES')}</p>
        <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;"/>
        <p><strong>Usuario:</strong> ${steamName}</p>
        <p><strong>Steam ID:</strong> ${steamId}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Steam Trade URL:</strong> <a href="${tradeUrl}" style="color:#f5632a;">${tradeUrl}</a></p>
        <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;"/>
        <p><strong>Redemption ID:</strong> ${payload.redemptionId}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(payload.createdAtIso)}</p>
        <p style="color:#6b6864;font-size:12px;margin-top:24px;">
          Revisa el canje en el panel de admin y envía la recompensa manualmente.
        </p>
      </div>
    `,
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
        <p>Has sido invitado al Portal de Marcas de SocialPro. Accede a nuestro roster de talentos, revisa métricas de campañas y envía propuestas directamente.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%);color:#fff;text-decoration:none;border-radius:9999px;font-weight:bold;">
            Establecer contraseña
          </a>
        </p>
        <p style="color: #6b6864; font-size: 13px;">Si no esperabas este email, puedes ignorarlo.</p>
      </div>
    `,
  });
}
