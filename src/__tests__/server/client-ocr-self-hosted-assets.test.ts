/**
 * Auditoría estática de los assets self-hosted del OCR cliente.
 *
 * Garantiza que los 4 archivos que tesseract.js + pdfjs necesitan en el
 * navegador están en `public/tessdata/` y que `runClientOcr.ts` los
 * configura por path absoluto local (NO CDN externo).
 *
 * Este test reventará si alguien:
 *   - borra accidentalmente uno de los archivos
 *   - cambia paths a CDN (cdn.jsdelivr.net, unpkg.com, etc.)
 *   - reintroduce `workerBlobURL: true` que puede romper CSP
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const PUBLIC_TESSDATA = path.join(PROJECT_ROOT, 'public', 'tessdata');
const RUN_CLIENT_OCR = path.join(
  PROJECT_ROOT, 'src', 'features', 'admin', 'finance-payroll', 'client-ocr', 'runClientOcr.ts',
);

describe('Client OCR — assets self-hosted en /public/tessdata', () => {
  it('existe spa.traineddata', () => {
    const f = path.join(PUBLIC_TESSDATA, 'spa.traineddata');
    expect(fs.existsSync(f)).toBe(true);
    expect(fs.statSync(f).size).toBeGreaterThan(500_000); // > 500KB
  });

  it('existe worker.min.js de tesseract.js', () => {
    const f = path.join(PUBLIC_TESSDATA, 'worker.min.js');
    expect(fs.existsSync(f)).toBe(true);
    expect(fs.statSync(f).size).toBeGreaterThan(50_000); // > 50KB
  });

  it('existe tesseract-core-simd-lstm.wasm.js (loader)', () => {
    const f = path.join(PUBLIC_TESSDATA, 'tesseract-core-simd-lstm.wasm.js');
    expect(fs.existsSync(f)).toBe(true);
    expect(fs.statSync(f).size).toBeGreaterThan(1_000_000); // > 1MB
  });

  it('existe tesseract-core-simd-lstm.wasm (binario WASM)', () => {
    const f = path.join(PUBLIC_TESSDATA, 'tesseract-core-simd-lstm.wasm');
    expect(fs.existsSync(f)).toBe(true);
    expect(fs.statSync(f).size).toBeGreaterThan(1_000_000); // > 1MB
  });

  it('existe pdf.worker.min.mjs de pdfjs-dist', () => {
    const f = path.join(PUBLIC_TESSDATA, 'pdf.worker.min.mjs');
    expect(fs.existsSync(f)).toBe(true);
    expect(fs.statSync(f).size).toBeGreaterThan(500_000); // > 500KB
  });
});

describe('runClientOcr.ts — configuración de paths', () => {
  const src = fs.readFileSync(RUN_CLIENT_OCR, 'utf-8');

  it('[4] configura workerPath, corePath y langPath en /tessdata', () => {
    expect(src).toMatch(/workerPath\s*:\s*PATHS\.tesseractWorker/);
    expect(src).toMatch(/corePath\s*:\s*PATHS\.tesseractCore/);
    expect(src).toMatch(/langPath\s*:\s*PATHS\.langDir/);
    // El path base se construye con template literal `${TESSDATA_BASE}/file`,
    // así que comprobamos los segmentos en lugar del path absoluto.
    expect(src).toMatch(/TESSDATA_BASE\s*=\s*['"]\/tessdata['"]/);
    expect(src).toMatch(/\/worker\.min\.js/);
    expect(src).toMatch(/\/tesseract-core-simd-lstm\.wasm\.js/);
    expect(src).toMatch(/\/pdf\.worker\.min\.mjs/);
  });

  it('configura workerBlobURL: false (evita CSP violation)', () => {
    expect(src).toMatch(/workerBlobURL\s*:\s*false/);
  });

  it('NO contiene URLs CDN externas (cdn.jsdelivr.net, unpkg.com, tessdata.projectnaptha.com)', () => {
    expect(src).not.toMatch(/cdn\.jsdelivr\.net/);
    expect(src).not.toMatch(/unpkg\.com/);
    expect(src).not.toMatch(/tessdata\.projectnaptha\.com/);
  });

  it('[3] el logger técnico no emite el texto OCR (data.text) directamente', () => {
    // Solo se loggea data.text.length (textLength), nunca data.text crudo.
    expect(src).toMatch(/textLength\s*[,}]/);
    expect(src).not.toMatch(/console\.log\(['"][^'"]*['"]\s*,\s*data\.text\b/);
    // El logger interno de tesseract está silenciado
    expect(src).toMatch(/logger\s*:\s*\(\s*\)\s*=>\s*\{\s*\}/);
  });
});
