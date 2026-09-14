// Real PDF.js/Tesseract stack, synthetic PDF, loopback only; no CRM or provider writes.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium, webkit } from '@playwright/test';
import { jsPDF } from 'jspdf';

const require = createRequire(import.meta.url);
const { extractPdfText } = require('../src/lib/parsers/pdf.ts');
const pdf = new jsPDF();
pdf.setFontSize(24);
pdf.text(['SOCIALPRO TEST', 'NOMINA SEPTIEMBRE 2026', 'TOTAL DEVENGADO 1000,00', 'LIQUIDO A PERCIBIR 800,00'], 20, 30);
const bytes = new Uint8Array(pdf.output('arraybuffer'));
const extracted = await extractPdfText(bytes.slice());
assert.equal(extracted.pageCount, 1);
assert.match(extracted.text, /SOCIALPRO TEST/);
const bundled = await build({
  entryPoints: ['src/features/admin/finance-payroll/client-ocr/runClientOcr.ts'],
  bundle: true, write: false, platform: 'browser', format: 'esm',
});
assert.equal(bundled.outputFiles.length, 1);
const assets = resolve('public/tessdata');
const mime = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  void (async () => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html><body>Isolated PDF/OCR fixture</body></html>');
    } else if (pathname === '/bundle.mjs') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(bundled.outputFiles[0].contents);
    } else if (pathname === '/fixture.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.end(bytes);
    } else if (pathname.startsWith('/tessdata/')) {
      const file = resolve(assets, pathname.slice('/tessdata/'.length));
      assert.ok(file.startsWith(assets + sep));
      const extension = file.slice(file.lastIndexOf('.'));
      res.setHeader('Content-Type', mime[extension] ?? 'application/octet-stream');
      res.end(await readFile(file));
    } else {
      res.writeHead(404).end();
    }
  })().catch(() => res.writeHead(500).end('Fixture asset error'));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
assert.ok(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
try {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.route('**/*', (route) => route.request().url().startsWith(origin + '/')
        ? route.continue() : route.abort());
      await page.goto(origin);
      const result = await page.evaluate(async () => {
        const { runClientOcr } = await import('/bundle.mjs');
        const source = await (await fetch('/fixture.pdf')).arrayBuffer();
        return runClientOcr({ file: new File([source], 'TEST-payroll.pdf', { type: 'application/pdf' }) });
      });
      assert.equal(result.ok, true, `${name}: ${JSON.stringify(result.debug ?? {})}`);
      assert.equal(result.pageCount, 1);
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].yearMonth, '2026-09');
      assert.match(result.rows[0].notes, /Líquido: 800/);
      console.log(JSON.stringify({ engine: name, serverPdf: 'passed', browserOcr: 'passed', rows: 1 }));
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((done) => server.close(done));
}
