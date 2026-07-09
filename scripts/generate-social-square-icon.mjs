/**
 * Genera public/icon-social-square-512.png a partir de public/logo.png.
 *
 * Estrategia:
 *   1. Detecta bbox del contenido opaco (alpha > umbral) del logo horizontal.
 *   2. Escanea filas y columnas para encontrar el gap horizontal entre
 *      el símbolo (arriba) y el texto "SOCIALPRO" (abajo).
 *   3. Recorta la parte superior (solo símbolo) y ajusta bbox.
 *   4. Compone sobre canvas 512x512 con fondo #0a0a0a (sp-black) y
 *      padding perimetral, manteniendo aspect ratio del símbolo.
 *
 * Sin dependencias de red. Determinista. Sin cambios de branding.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SRC = 'public/logo.png';
const OUT = 'public/icon-social-square-512.png';
const CANVAS = 512;
const BG = { r: 10, g: 10, b: 10, alpha: 1 }; // #0a0a0a — sp-black
const SYMBOL_TARGET_RATIO = 0.62;
const ALPHA_THRESHOLD = 40;

function detectBBox(raw, width, height, channels) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = raw[(y * width + x) * channels + 3];
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

function findGapRow(raw, width, height, channels, yStart, yEnd) {
  const opaquePerRow = new Array(height).fill(0);
  for (let y = yStart; y < yEnd; y++) {
    for (let x = 0; x < width; x++) {
      if (raw[(y * width + x) * channels + 3] > ALPHA_THRESHOLD) opaquePerRow[y]++;
    }
  }
  const OPAQUE_THRESHOLD = width * 0.02;
  const GAP_HEIGHT_THRESHOLD = Math.max(8, Math.floor(height * 0.02));

  let gapStart = -1;
  let gapHeight = 0;
  const searchStart = yStart + Math.floor((yEnd - yStart) * 0.15);
  for (let y = searchStart; y < yEnd; y++) {
    if (opaquePerRow[y] < OPAQUE_THRESHOLD) {
      if (gapStart === -1) gapStart = y;
      gapHeight++;
      if (gapHeight >= GAP_HEIGHT_THRESHOLD) return gapStart;
    } else {
      gapStart = -1;
      gapHeight = 0;
    }
  }
  return null;
}

async function main() {
  const src = sharp(SRC);
  const meta = await src.metadata();
  console.log('Source:', meta.width + 'x' + meta.height, 'channels=' + meta.channels);

  // Raw RGBA para análisis pixel a pixel
  const raw = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = raw.info;

  // 1) BBox global del contenido opaco
  const globalBBox = detectBBox(raw.data, W, H, C);
  console.log('Global bbox:', globalBBox);

  // 2) Gap entre símbolo y texto — busca en las filas del bbox
  const gapY = findGapRow(raw.data, W, H, C, globalBBox.minY, globalBBox.maxY);
  console.log('Gap between símbolo & texto row:', gapY);

  // 3) BBox solo del símbolo: entre minY y (gapY - 1) del bbox
  const symbolYEnd = gapY ?? globalBBox.maxY;
  // Escanea columnas del símbolo dentro de esa banda
  let symMinX = W, symMaxX = -1;
  for (let y = globalBBox.minY; y < symbolYEnd; y++) {
    for (let x = 0; x < W; x++) {
      if (raw.data[(y * W + x) * C + 3] > ALPHA_THRESHOLD) {
        if (x < symMinX) symMinX = x;
        if (x > symMaxX) symMaxX = x;
      }
    }
  }
  const symbol = {
    left: symMinX,
    top: globalBBox.minY,
    width: symMaxX - symMinX + 1,
    height: symbolYEnd - globalBBox.minY + 1,
  };
  console.log('Symbol bbox:', symbol);

  // 4) Extract del símbolo puro y resize
  const maxDim = Math.floor(CANVAS * SYMBOL_TARGET_RATIO);
  const symbolPng = await sharp(SRC)
    .extract(symbol)
    .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true });
  console.log('Symbol resized:', symbolPng.info.width + 'x' + symbolPng.info.height);

  // 5) Componer sobre canvas negro
  const left = Math.round((CANVAS - symbolPng.info.width) / 2);
  const top = Math.round((CANVAS - symbolPng.info.height) / 2);
  const out = await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: BG },
  })
    .composite([{ input: symbolPng.data, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(OUT, out.data);
  console.log('\n✅ Wrote', OUT);
  console.log('   dim:', out.info.width + 'x' + out.info.height);
  console.log('   size:', (out.info.size / 1024).toFixed(1) + ' KB');

  // Previews reducidos
  const p96 = await sharp(out.data).resize(96, 96).png().toBuffer();
  const p48 = await sharp(out.data).resize(48, 48).png().toBuffer();
  await writeFile('.scratch/social-preview-icon/preview-96.png', p96);
  await writeFile('.scratch/social-preview-icon/preview-48.png', p48);
  console.log('\nPreviews escritos en .scratch/social-preview-icon/');
}

main().catch((e) => { console.error(e); process.exit(1); });
