/**
 * Premium blog covers — composición Sharp+SVG cinematográfica.
 *
 * Para los 3 posts prioritarios (Razer / 1WIN / SkinsMonkey).
 *
 * Composición:
 *  - Capa 1: fondo oscuro con gradiente direccional + radial accent glow
 *  - Capa 2: light leak / streak diagonal asimétrico
 *  - Capa 3: textura geométrica (líneas finas, hex, dots) muy sutil
 *  - Capa 4: gran halo difuminado detrás del logo
 *  - Capa 5: logo de marca grande como protagonista (composite directo)
 *  - Capa 6: kicker categoría top-left + "× SocialPro" debajo del logo
 *  - Capa 7: stripe acento bottom + wordmark SocialPro bottom-right
 *  - Capa 8: vignette cinemática + grain sutil
 *
 * Output: 1600×900 JPG @ 88. Sustituye los JPGs existentes en /public/images/blog/.
 *
 * NO requiere DALL-E ni servicios externos.
 */

import sharp from 'sharp';
import { rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const W = 1600;
const H = 900;

// ───────────────────────────────────────────────────────────────────
// Posts a generar — paleta y composición específica por marca

const POSTS = [
  {
    out:        'public/images/blog/razer-socialpro-creadores-gaming.jpg',
    brand:      'RAZER',
    brandLogo:  'public/images/brands/razer.png',
    logoMaxW:   600,
    logoMaxH:   210,
    accent:     '#00ff7a',          // verde Razer cinematográfico
    accentSoft: 'rgba(0,255,122,0.40)',
    secondary:  '#f5632a',           // toque SP orange en streak
    bgFar:      '#020a05',
    bgMid:      '#06170a',
    bgNear:     '#0c2913',
    kicker:     'CASO DE ÉXITO · GAMING HARDWARE',
    pattern:    'lines',             // líneas diagonales tipo circuit
  },
  {
    out:        'public/images/blog/1win-socialpro-influencers-instagram.jpg',
    brand:      '1WIN',
    brandLogo:  'public/images/brands/1win.png',
    logoMaxW:   620,
    logoMaxH:   220,
    accent:     '#00b8ff',           // azul 1WIN tournament
    accentSoft: 'rgba(0,184,255,0.42)',
    secondary:  '#ff3a3a',           // splash rojo arena
    bgFar:      '#02060f',
    bgMid:      '#04122a',
    bgNear:     '#082151',
    kicker:     'CASO DE ÉXITO · IGAMING',
    pattern:    'hex',
  },
  {
    out:        'public/images/blog/skinsmonkey-socialpro-cs2-marketplace.jpg',
    brand:      'SKINSMONKEY',
    brandLogo:  null,                // logo PNG insuficiente — usar tipografía
    brandText:  'SKINSMONKEY',
    accent:     '#ffcc00',           // amarillo SkinsMonkey
    accentSoft: 'rgba(255,204,0,0.38)',
    secondary:  '#ff5722',           // rust orange CS2
    bgFar:      '#0a0903',
    bgMid:      '#1a1306',
    bgNear:     '#3a2a08',
    kicker:     'CASO DE ÉXITO · CS2 MARKETPLACE',
    pattern:    'dots',
  },
];

// ───────────────────────────────────────────────────────────────────
// Patrones SVG por marca

function patternDef(kind, accent) {
  switch (kind) {
    case 'lines':
      return `
        <pattern id="pat" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <line x1="0" y1="0" x2="0" y2="56" stroke="${accent}" stroke-width="0.8" opacity="0.55"/>
          <line x1="14" y1="0" x2="14" y2="56" stroke="${accent}" stroke-width="0.4" opacity="0.30"/>
          <line x1="42" y1="0" x2="42" y2="56" stroke="${accent}" stroke-width="0.4" opacity="0.30"/>
        </pattern>`;
    case 'hex':
      return `
        <pattern id="pat" width="48" height="42" patternUnits="userSpaceOnUse">
          <polygon points="24,2 44,14 44,30 24,42 4,30 4,14"
                   fill="none" stroke="${accent}" stroke-width="0.7" opacity="0.55"/>
        </pattern>`;
    case 'dots':
      return `
        <pattern id="pat" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="${accent}" opacity="0.65"/>
        </pattern>`;
    default:
      return '<pattern id="pat" width="1" height="1"/>';
  }
}

// ───────────────────────────────────────────────────────────────────
// SVG base — fondo + capas decorativas (sin logo)

function buildBackgroundSvg(post) {
  const { accent, accentSoft, secondary, bgFar, bgMid, bgNear, pattern, kicker, brand } = post;
  const accentGlow = accentSoft;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <!-- Base gradient (top-left → bottom-right) -->
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="${bgFar}"/>
        <stop offset="55%"  stop-color="${bgMid}"/>
        <stop offset="100%" stop-color="${bgNear}"/>
      </linearGradient>

      <!-- Light leak diagonal (esquina superior derecha) -->
      <radialGradient id="leak" cx="0.85" cy="0.15" r="0.65">
        <stop offset="0%"  stop-color="${accent}" stop-opacity="0.32"/>
        <stop offset="40%" stop-color="${accent}" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>

      <!-- Glow secundario (esquina inferior izquierda) -->
      <radialGradient id="leak2" cx="0.10" cy="0.95" r="0.55">
        <stop offset="0%"  stop-color="${secondary}" stop-opacity="0.20"/>
        <stop offset="60%" stop-color="${secondary}" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="${secondary}" stop-opacity="0"/>
      </radialGradient>

      <!-- Halo central (donde irá el logo) -->
      <radialGradient id="centerHalo" cx="0.5" cy="0.5" r="0.42">
        <stop offset="0%"   stop-color="${accent}" stop-opacity="0.28"/>
        <stop offset="50%"  stop-color="${accent}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>

      <!-- Vignette cinemática (oscurece bordes) -->
      <radialGradient id="vignette" cx="0.5" cy="0.55" r="0.85">
        <stop offset="55%" stop-color="black" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.55"/>
      </radialGradient>

      <!-- Streak oblicuo (rayo de luz delgado) -->
      <linearGradient id="streak" x1="0" y1="0" x2="1" y2="1">
        <stop offset="40%" stop-color="${accent}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${accent}" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="${accent}" stop-opacity="0"/>
      </linearGradient>

      <!-- Stripe acento bottom -->
      <linearGradient id="bottomStripe" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="${accent}" stop-opacity="0"/>
        <stop offset="20%"  stop-color="${accent}" stop-opacity="0.85"/>
        <stop offset="50%"  stop-color="${accent}" stop-opacity="1"/>
        <stop offset="80%"  stop-color="${secondary}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${secondary}" stop-opacity="0"/>
      </linearGradient>

      ${patternDef(pattern, accent)}
    </defs>

    <!-- 1) Base oscura -->
    <rect width="${W}" height="${H}" fill="url(#bg)"/>

    <!-- 2) Patrón geométrico (cubre todo, opacidad muy baja) -->
    <rect width="${W}" height="${H}" fill="url(#pat)" opacity="0.06"/>

    <!-- 3) Grid horizontal sutil (líneas tipo magazine) -->
    <g opacity="0.05">
      <line x1="0" y1="${H * 0.12}" x2="${W}" y2="${H * 0.12}" stroke="white" stroke-width="0.5"/>
      <line x1="0" y1="${H * 0.88}" x2="${W}" y2="${H * 0.88}" stroke="white" stroke-width="0.5"/>
    </g>

    <!-- 4) Light leak superior derecha -->
    <rect width="${W}" height="${H}" fill="url(#leak)"/>

    <!-- 5) Glow secundario inferior izquierda -->
    <rect width="${W}" height="${H}" fill="url(#leak2)"/>

    <!-- 6) Halo central detrás del logo -->
    <rect width="${W}" height="${H}" fill="url(#centerHalo)"/>

    <!-- 7) Streak diagonal (rayo de luz) — desde top-right hacia center-left -->
    <g transform="rotate(-18 ${W / 2} ${H / 2})" opacity="0.65">
      <rect x="${W * 0.2}" y="${H * 0.30}" width="${W * 0.7}" height="2" fill="url(#streak)"/>
      <rect x="${W * 0.3}" y="${H * 0.45}" width="${W * 0.55}" height="1" fill="${accent}" opacity="0.20"/>
    </g>

    <!-- 8) Vignette -->
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>

    <!-- 9) Kicker top-left -->
    <g transform="translate(60, 65)">
      <rect x="0" y="-6" width="3" height="14" fill="${accent}"/>
      <text x="14" y="6" font-family="Arial Black, Helvetica, sans-serif" font-size="14"
            font-weight="900" letter-spacing="6" fill="${accent}" opacity="0.95">${kicker}</text>
    </g>

    <!-- 10) Marca pequeña top-right (tag de proyecto) -->
    <g transform="translate(${W - 60}, 65)">
      <text x="0" y="6" text-anchor="end"
            font-family="Arial Black, Helvetica, sans-serif" font-size="13"
            font-weight="900" letter-spacing="5" fill="white" opacity="0.45">SOCIALPRO BLOG</text>
    </g>

    <!-- 11) Texto "× SocialPro" debajo del centro (espacio reservado para logo) -->
    <g transform="translate(${W / 2}, ${H * 0.78})">
      <line x1="-90" y1="0" x2="-22" y2="0" stroke="${accent}" stroke-width="1" opacity="0.55"/>
      <text x="0" y="4" text-anchor="middle"
            font-family="Arial Black, Helvetica, sans-serif" font-size="14"
            font-weight="900" letter-spacing="6" fill="${accent}" opacity="0.85">× SOCIALPRO</text>
      <line x1="22" y1="0" x2="90" y2="0" stroke="${accent}" stroke-width="1" opacity="0.55"/>
    </g>

    <!-- 12) Tagline bottom-left -->
    <g transform="translate(60, ${H - 70})">
      <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="11"
            font-weight="700" letter-spacing="3" fill="white" opacity="0.30">CAMPAÑA · ${brand}</text>
      <text x="0" y="22" font-family="Arial, Helvetica, sans-serif" font-size="11"
            font-weight="400" letter-spacing="3" fill="white" opacity="0.18">SOCIALPRO.ES/CASOS</text>
    </g>

    <!-- 13) Stripe acento bottom -->
    <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#bottomStripe)"/>

    <!-- 14) Brand text (solo cuando no hay logo PNG) -->
    ${post.brandText && !post.brandLogo ? `
      <g transform="translate(${W / 2}, ${H / 2})">
        <text x="0" y="0" text-anchor="middle"
              font-family="Arial Black, Helvetica, sans-serif" font-size="120"
              font-weight="900" letter-spacing="6" fill="${accent}" opacity="0.95">${post.brandText}</text>
        <text x="0" y="0" text-anchor="middle"
              font-family="Arial Black, Helvetica, sans-serif" font-size="120"
              font-weight="900" letter-spacing="6" fill="none"
              stroke="${accent}" stroke-width="1.5" opacity="0.40">${post.brandText}</text>
      </g>
    ` : ''}
  </svg>`;
}

// ───────────────────────────────────────────────────────────────────
// Glow detrás del logo (capa difuminada)

function buildLogoHaloSvg(accentSoft) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%"  stop-color="${accentSoft}" stop-opacity="1"/>
        <stop offset="60%" stop-color="${accentSoft}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${accentSoft}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="${W / 2}" cy="${H / 2}" rx="${W * 0.30}" ry="${H * 0.30}" fill="url(#halo)"/>
  </svg>`;
}

// ───────────────────────────────────────────────────────────────────
// Generación

async function ensureDir(path) {
  const dir = path.substring(0, path.lastIndexOf('/'));
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function buildCover(post) {
  await ensureDir(post.out);

  // 1) Render del fondo SVG → buffer PNG
  const bgBuf = await sharp(Buffer.from(buildBackgroundSvg(post)))
    .png()
    .toBuffer();

  // 2) Render del halo (capa intermedia, blureada por Sharp)
  const haloBuf = await sharp(Buffer.from(buildLogoHaloSvg(post.accentSoft)))
    .blur(60)
    .png()
    .toBuffer();

  const composites = [{ input: haloBuf, top: 0, left: 0, blend: 'screen' }];

  // 3) Logo de marca (si aplica) — centrado, con drop-shadow
  if (post.brandLogo) {
    try {
      const logoMaxW = post.logoMaxW ?? 560;
      const logoMaxH = post.logoMaxH ?? 200;
      const logoBuf = await sharp(post.brandLogo)
        .resize({ width: logoMaxW, height: logoMaxH, fit: 'inside' })
        .png()
        .toBuffer();
      const meta = await sharp(logoBuf).metadata();
      const lw = meta.width ?? logoMaxW;
      const lh = meta.height ?? logoMaxH;
      const left = Math.round((W - lw) / 2);
      const top = Math.round((H - lh) / 2 - H * 0.04); // ligeramente arriba del centro

      composites.push({ input: logoBuf, top, left });
    } catch (e) {
      console.warn(`  · logo error (${post.brandLogo}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 4) Composición final + JPG quality 88
  await sharp(bgBuf)
    .composite(composites)
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(post.out + '.tmp');
  await rename(post.out + '.tmp', post.out);

  console.log(`  ✓  ${post.out.split('/').pop()}  (${post.brand})`);
}

async function main() {
  console.log(`\n  Premium blog covers — generando ${POSTS.length} covers a ${W}×${H}\n`);
  for (const post of POSTS) {
    await buildCover(post);
  }
  console.log(`\n  ✅  Done.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
