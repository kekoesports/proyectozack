import 'server-only';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Fixed, bundled OFL fonts only. Embedded to keep sandboxed previews entirely offline.
export async function studioPreviewFonts() {
  const [display, body] = await Promise.all([
    readFile(resolve('public/fonts/studio/BarlowCondensed-ExtraBold.ttf')),
    readFile(resolve('public/fonts/studio/Inter.ttf')),
  ]);
  return { display: `data:font/ttf;base64,${display.toString('base64')}`, body: `data:font/ttf;base64,${body.toString('base64')}` };
}
