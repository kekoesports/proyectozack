/**
 * Blog cover images — 1200×630px
 *
 * Diseño limpio y minimalista:
 *  - Fondo oscuro puro
 *  - SP full logo centrado arriba
 *  - Logo de marca centrado abajo (compositing directo, sin eliminar píxeles)
 *  - Posts editoriales: categoría en texto accent
 */
import sharp from 'sharp';
import { rename } from 'fs/promises';

const W = 1200, H = 630;

const accentBar = Buffer.from(`<svg width="${W}" height="6" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="#f5632a"/>
    <stop offset="35%"  stop-color="#e03070"/>
    <stop offset="62%"  stop-color="#c42880"/>
    <stop offset="100%" stop-color="#8b3aad"/>
  </linearGradient></defs>
  <rect width="${W}" height="6" fill="url(#g)"/>
</svg>`);

const spLogoRaw = await sharp('public/images/logos/socialpro-full.png')
  .resize({ width: 280, height: 280, fit: 'inside' })
  .toBuffer();
const spMeta = await sharp(spLogoRaw).metadata();
const spW = spMeta.width ?? 280;
const spH = spMeta.height ?? 280;

const posts = [
  {
    out:       'public/images/blog/1win-socialpro-influencers-instagram.jpg',
    accent:    '#00c2ff',
    brandLogo: 'public/images/brands/1win.png',
    logoMaxW:  480, logoMaxH: 160,
    label:     '1WIN × SOCIALPRO',
  },
  {
    out:       'public/images/blog/skinsmonkey-socialpro-cs2-marketplace.jpg',
    accent:    '#f5c500',
    brandText: 'SKINSMONKEY',
    label:     'SKINSMONKEY × SOCIALPRO',
  },
  {
    out:       'public/images/blog/razer-socialpro-creadores-gaming.jpg',
    accent:    '#39ff14',
    brandLogo: 'public/images/brands/razer.png',
    logoMaxW:  520, logoMaxH: 130,
    label:     'RAZER × SOCIALPRO',
  },
  { out: 'public/images/blog/monetizar-canal-youtube-gaming-2026.jpg',  accent: '#ff4444', category: 'MONETIZACIÓN',       label: 'MONETIZACIÓN'    },
  { out: 'public/images/blog/guia-marketing-gaming-espana-2026.jpg',    accent: '#e03070', category: 'MARKETING GAMING',   label: 'MARKETING'       },
  { out: 'public/images/blog/tendencias-gaming-latam-2026.jpg',         accent: '#8b3aad', category: 'TENDENCIAS LATAM',   label: 'TENDENCIAS'      },
  { out: 'public/images/blog/caso-exito-campana-gaming-hardware.jpg',   accent: '#f5632a', category: 'CASO DE ÉXITO', label: 'CASO DE ÉXITO'  },
  { out: 'public/images/blog/guia-creadores-conseguir-sponsor.jpg',     accent: '#c42880', category: 'GUÍA CREADORES',label: 'GUÍA'            },
  { out: 'public/images/blog/tendencias-gaming-espana-2025.jpg',        accent: '#5b9bd5', category: 'TENDENCIAS ESPAÑA', label: 'TENDENCIAS' },
];

for (const post of posts) {
  const isCampaign = !!(post.brandLogo || post.brandText);

  const spTop  = 36;
  const spLeft = Math.round((W - spW) / 2);
  const spBot  = spTop + spH;
  const divY   = spBot + 24;
  const contentTop = divY + 28;

  // Brand logo — resize directo sin manipulación de píxeles
  let brandBuf = null, brandW = 0, brandH = 0, brandLeft = 0;
  if (post.brandLogo) {
    try {
      brandBuf = await sharp(post.brandLogo)
        .resize({ width: post.logoMaxW ?? 480, height: post.logoMaxH ?? 150, fit: 'inside' })
        .png()
        .toBuffer();
      const lm = await sharp(brandBuf).metadata();
      brandW = lm.width ?? 480;
      brandH = lm.height ?? 150;
      brandLeft = Math.round((W - brandW) / 2);
    } catch (e) {
      console.warn(`  logo error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Catfont para editoriales
  const catFontSize = (post.category ?? '').length > 14 ? 36 : 44;
  const catY = contentTop + catFontSize;

  // Texto de marca sin logo (SkinsMonkey)
  const brandOnlyText = isCampaign && post.brandText && !post.brandLogo
    ? `<text x="${W / 2}" y="${contentTop + 78}" text-anchor="middle"
        font-family="Arial Black,sans-serif" font-size="80" font-weight="900"
        letter-spacing="4" fill="${post.accent}" opacity="0.92">${post.brandText}</text>`
    : '';

  const centerContent = isCampaign
    ? `<line x1="64" y1="${divY}" x2="${W / 2 - 22}" y2="${divY}"
         stroke="${post.accent}" stroke-width="1" stroke-opacity="0.28"/>
       <text x="${W / 2}" y="${divY + 6}" text-anchor="middle"
         font-family="Arial,sans-serif" font-size="16"
         fill="${post.accent}" opacity="0.40">&#215;</text>
       <line x1="${W / 2 + 22}" y1="${divY}" x2="${W - 64}" y2="${divY}"
         stroke="${post.accent}" stroke-width="1" stroke-opacity="0.28"/>
       ${brandOnlyText}`
    : `<line x1="80" y1="${divY}" x2="${W - 80}" y2="${divY}"
         stroke="${post.accent}" stroke-width="1" stroke-opacity="0.16"/>
       <text x="${W / 2}" y="${catY}" text-anchor="middle"
         font-family="Arial Black,sans-serif" font-size="${catFontSize}" font-weight="900"
         letter-spacing="6" fill="${post.accent}" opacity="0.86">
         ${(post.category ?? '').replace(/&/g,'&amp;')}
       </text>`;

  const bg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%"   stop-color="#0d0d0d"/>
        <stop offset="100%" stop-color="#111118"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="${W/2}" cy="${H*0.6}" rx="480" ry="230" fill="${post.accent}" opacity="0.055"/>
    <ellipse cx="${W/2}" cy="${H*0.3}" rx="280" ry="150" fill="${post.accent}" opacity="0.030"/>
    ${centerContent}
    <text x="${W-40}" y="${H-18}" text-anchor="end"
      font-family="Arial,sans-serif" font-size="11" font-weight="700"
      letter-spacing="3" fill="white" opacity="0.15">
      ${(post.label ?? '').replace(/&/g,'&amp;')}
    </text>
  </svg>`);

  const composites = [
    { input: spLogoRaw, top: spTop,  left: spLeft },
    { input: accentBar, top: H - 6,  left: 0 },
  ];
  if (brandBuf) composites.push({ input: brandBuf, top: contentTop, left: brandLeft });

  await sharp(bg)
    .composite(composites)
    .jpeg({ quality: 95 })
    .toFile(post.out + '.tmp');
  await rename(post.out + '.tmp', post.out);
  console.log(`✓  ${post.out.split('/').pop()}`);
}

console.log('\n✅  Done.');
