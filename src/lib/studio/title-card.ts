import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { resolve } from 'node:path';
import type { StudioBoard, StudioScene } from '@/lib/schemas/studio-production';

/** Break long unspaced words too: URLs must never escape the title-safe area. */
export function wrapStudioText(text: string, maxWidth: number, measure: (value: string) => number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth) { line = next; continue; }
    if (line) { lines.push(line); line = ''; }
    for (const character of word) {
      if (line && measure(line + character) > maxWidth) { lines.push(line); line = ''; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function createStudioTitleCard(scene: StudioScene, board: StudioBoard, w: number, h: number) {
  GlobalFonts.registerFromPath(resolve('public/fonts/studio/BarlowCondensed-ExtraBold.ttf'), 'Studio Display');
  GlobalFonts.registerFromPath(resolve('public/fonts/studio/Inter.ttf'), 'Studio Body');
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const dark = board.palette === 'dark';
  const pad = w * .085;
  const width = w - pad * 2;
  const top = h * .32;
  const bottom = h * .82;
  // Fit both blocks together, keeping a reserved footer in every aspect ratio.
  let fitted: { title: string[]; body: string[]; titleSize: number; bodySize: number; gap: number } | null = null;
  for (let step = 0; step <= 12; step++) {
    const scale = 1 - step * .04;
    const titleSize = Math.round(76 * scale);
    const bodySize = Math.round(28 * scale);
    ctx.font = `800 ${titleSize}px Studio Display`;
    const title = wrapStudioText(scene.title.toLocaleUpperCase('es'), width, (s) => ctx.measureText(s).width);
    ctx.font = `400 ${bodySize}px Studio Body`;
    const body = wrapStudioText(scene.body, width, (s) => ctx.measureText(s).width);
    const gap = title.length && body.length ? 32 * scale : 0;
    if (title.length * titleSize * 1.05 + gap + body.length * bodySize * 1.4 <= bottom - top) {
      fitted = { title, body, titleSize, bodySize, gap }; break;
    }
  }
  if (!fitted) throw new Error('title_text_does_not_fit');
  ctx.fillStyle = dark ? '#101016' : '#f5f3ef'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = dark ? '#b7b2ac' : '#686360'; ctx.font = '500 19px Studio Body';
  ctx.fillText('SOCIALPRO  /  CREATOR STUDIO', pad, h * .12);
  const gradient = ctx.createLinearGradient(pad, 0, w - pad, 0);
  gradient.addColorStop(0, '#f5632a'); gradient.addColorStop(.55, '#e03070'); gradient.addColorStop(1, '#8b3aad');
  ctx.fillStyle = gradient; ctx.fillRect(pad, h * .24, w * .16, 7);
  ctx.textBaseline = 'top';
  ctx.fillStyle = dark ? '#ffffff' : '#15141a';
  ctx.font = `800 ${fitted.titleSize}px Studio Display`;
  let y = top;
  for (const line of fitted.title) { ctx.fillText(line, pad, y); y += fitted.titleSize * 1.05; }
  y += fitted.gap;
  ctx.fillStyle = dark ? '#c7c3cc' : '#57535e'; ctx.font = `400 ${fitted.bodySize}px Studio Body`;
  for (const line of fitted.body) { ctx.fillText(line, pad, y); y += fitted.bodySize * 1.4; }
  ctx.fillStyle = gradient; ctx.fillRect(pad, h * .88, width, 2);
  ctx.textBaseline = 'alphabetic';
  ctx.font = '500 17px Studio Body'; ctx.fillStyle = dark ? '#a8a4ae' : '#6a6570';
  ctx.fillText('GAMING. PERSONAS. IDEAS.', pad, h * .93);
  return canvas.toBuffer('image/png');
}
