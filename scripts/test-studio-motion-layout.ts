import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { studioMotionDocument } from '../src/lib/studio/motion-document';
import { STUDIO_MOTION_DESIGNS } from '../src/lib/studio/motion-catalog';

async function main() {
  const { stdout } = await promisify(execFile)(process.execPath, [resolve('node_modules/hyperframes/bin/hyperframes.mjs'), 'browser', 'path'],
    { windowsHide: true, env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' } });
  const browser = await chromium.launch({ executablePath: stdout.trim(), headless: true });
  const [display, body] = await Promise.all([readFile(resolve('public/fonts/studio/BarlowCondensed-ExtraBold.ttf')), readFile(resolve('public/fonts/studio/Inter.ttf'))]);
  const fonts = { display: `data:font/ttf;base64,${display.toString('base64')}`, body: `data:font/ttf;base64,${body.toString('base64')}` };
  let checked = 0;
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const format of ['9:16', '1:1', '16:9'] as const) {
      for (const design of STUDIO_MOTION_DESIGNS) {
        for (const maxText of [false, true]) {
          const html = studioMotionDocument({ id: randomUUID(), kind: 'title', assetId: null, start: 0, duration: 3, motion: design.id,
            title: maxText ? 'Colaboraciones con personas, ideas y contenido con sentido.'.padEnd(60, '.') : design.title,
            body: maxText ? (design.id === 'steps-v1' ? ['Una propuesta con contexto para la comunidad.', 'Coordinar el contenido y revisar los materiales.', 'Publicar después de revisar la pieza y permisos.'].map((text) => text.padEnd(48, '.')).join('\n') : 'Texto largo de prueba. '.repeat(11).slice(0, 150)) : design.body },
          { format, palette: format === '1:1' ? 'light' : 'dark' }, fonts);
          await page.goto('about:blank');
          await page.setContent(html);
          await page.evaluate(() => document.fonts.ready);
          await page.evaluate('window.renderFrame(.2)');
          const before = await page.locator('h1').boundingBox();
          await page.evaluate('window.renderFrame(1.5)');
          const after = await page.locator('h1').boundingBox();
          assert(before && after && before.y !== after.y, `Title must animate: ${format}/${design.id}/${maxText} ${before?.y}/${after?.y}; errors=${errors.join('|')}`);
          const layout = await page.evaluate(() => {
            const box = document.querySelector('.content');
            const footer = document.querySelector('.rule');
            if (!box || !footer) return { fits: false, minText: 0 };
            const bounds = box.getBoundingClientRect();
            const children = [...box.children].map((el) => el.getBoundingClientRect());
            return { fits: children.every((r) => r.left >= bounds.left - 1 && r.right <= bounds.right + 1 && r.top >= bounds.top - 1 && r.bottom < footer.getBoundingClientRect().top),
              minText: Math.min(...[...box.querySelectorAll('h1,.description,.step span,.contact')].map((el) => parseFloat(getComputedStyle(el).fontSize))) };
          });
          assert(layout.fits, `Layout overflow: ${format}/${design.id}/${maxText}`);
          assert(layout.minText >= 20, `Unreadable text: ${format}/${design.id}/${maxText}: ${layout.minText}`);
          checked++;
        }
      }
    }
    assert.equal(errors.length, 0, 'No runtime errors');
    console.log(`PASS ${checked} motion layouts: actual title animation, complete text, safe margins, readable sizes, no browser errors`);
  } finally { await browser.close(); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'motion_layout_failed'); process.exitCode = 1; });
