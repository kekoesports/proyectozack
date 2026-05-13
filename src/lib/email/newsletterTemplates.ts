import { absoluteUrl } from '@/lib/site-url';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const BRAND_GRADIENT = 'background: linear-gradient(135deg, #f5632a 0%, #e03070 35%, #c42880 62%, #8b3aad 100%)';
const BG_DARK = '#0d0d0f';
const CARD_BG = '#141416';
const MUTED = '#6b6864';
const BORDER = '#2a2a2e';

function unsubscribeUrl(token: string): string {
  return absoluteUrl(`/unsubscribe?token=${encodeURIComponent(token)}`);
}

function baseLayout(body: string, unsubToken: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BG_DARK};font-family:Inter,-apple-system,sans-serif;color:#e8e4e0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_DARK};padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:0 0 24px 0;text-align:center;">
            <div style="display:inline-block;${BRAND_GRADIENT};padding:2px;border-radius:12px;">
              <div style="background:${BG_DARK};border-radius:10px;padding:10px 24px;">
                <span style="font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:#f5632a;">
                  SocialPro News
                </span>
              </div>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 0;text-align:center;">
            <p style="margin:0;font-size:11px;color:${MUTED};">
              Recibes este email porque te suscribiste a SocialPro News.
            </p>
            <p style="margin:6px 0 0;">
              <a href="${unsubscribeUrl(unsubToken)}" style="font-size:11px;color:${MUTED};text-decoration:underline;">
                Darse de baja
              </a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildWelcomeEmail(unsubToken: string): string {
  const body = `
    <div style="height:4px;${BRAND_GRADIENT};"></div>
    <div style="padding:32px 36px;">
      <h1 style="margin:0 0 16px;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-0.01em;color:#fff;line-height:1.1;">
        Ya estás dentro.
      </h1>
      <p style="margin:0 0 12px;font-size:15px;color:#c8c4c0;line-height:1.6;">
        Bienvenido al newsletter de <strong style="color:#fff;">SocialPro News</strong>.
        Recibirás las noticias más importantes de <strong style="color:#f5632a;">CS2</strong>,
        esports y gaming — sin ruido.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#8a8680;">
        Te escribimos cuando hay algo que importa. Sin spam, sin relleno.
      </p>
      <a href="${absoluteUrl('/news')}"
         style="display:inline-block;${BRAND_GRADIENT};color:#fff;text-decoration:none;padding:12px 28px;border-radius:9999px;font-weight:700;font-size:14px;">
        Ver las últimas noticias →
      </a>
    </div>
  `;
  return baseLayout(body, unsubToken);
}

export function buildNewsletterEmail(payload: {
  postTitle:    string;
  postExcerpt:  string;
  postUrl:      string;
  coverUrl?:    string | null | undefined;
  author:       string;
  unsubToken:   string;
}): string {
  const title   = escapeHtml(payload.postTitle);
  const excerpt = escapeHtml(payload.postExcerpt);
  const author  = escapeHtml(payload.author);
  const postUrl = payload.postUrl;
  const cover   = payload.coverUrl ? escapeHtml(payload.coverUrl) : null;

  const coverBlock = cover
    ? `<img src="${cover}" alt="" width="560" style="width:100%;max-width:560px;display:block;border:0;" />`
    : `<div style="height:4px;${BRAND_GRADIENT};"></div>`;

  const body = `
    ${coverBlock}
    <div style="padding:28px 36px 32px;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:#f5632a;">
        SocialPro News
      </p>
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:900;text-transform:uppercase;color:#fff;line-height:1.15;letter-spacing:-0.01em;">
        ${title}
      </h1>
      <p style="margin:0 0 10px;font-size:13px;color:#8a8680;">
        Por <strong style="color:#c8c4c0;">${author}</strong>
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#c8c4c0;line-height:1.65;">
        ${excerpt}
      </p>
      <a href="${postUrl}"
         style="display:inline-block;${BRAND_GRADIENT};color:#fff;text-decoration:none;padding:12px 28px;border-radius:9999px;font-weight:700;font-size:14px;">
        Leer artículo completo →
      </a>
    </div>
  `;
  return baseLayout(body, payload.unsubToken);
}
