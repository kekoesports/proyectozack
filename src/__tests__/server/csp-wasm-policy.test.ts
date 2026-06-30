/**
 * Auditoría estática del CSP de next.config.ts respecto a WebAssembly + OCR.
 *
 * Garantiza que:
 *   1. script-src incluye 'wasm-unsafe-eval' (necesario para WASM de tesseract.js).
 *   2. NO se relaja a 'unsafe-eval' (que abriría también eval() de JS).
 *   3. No se introducen dominios CDN externos para servir worker/core OCR
 *      (cdn.jsdelivr.net, unpkg.com, tessdata.projectnaptha.com).
 *
 * Si alguien futuro añade 'unsafe-eval' o un CDN externo, este test reventará.
 */

import * as fs from 'fs';
import * as path from 'path';

const NEXT_CONFIG = path.resolve(__dirname, '..', '..', '..', 'next.config.ts');
const source = fs.readFileSync(NEXT_CONFIG, 'utf-8');

// Extrae la value del header Content-Security-Policy
function extractCsp(): string {
  const match = source.match(/key:\s*['"]Content-Security-Policy['"],\s*value:\s*\[([\s\S]*?)\]\.join/);
  if (!match || !match[1]) throw new Error('CSP directive not found in next.config.ts');
  return match[1];
}

describe('CSP — WASM policy en next.config.ts', () => {
  const csp = extractCsp();

  it('[1] script-src incluye "wasm-unsafe-eval" (permite WASM.instantiate sin habilitar eval)', () => {
    // Buscar la línea de script-src con wasm-unsafe-eval
    const scriptSrcLine = csp.split('\n').find((l) => l.includes('script-src'));
    expect(scriptSrcLine).toBeDefined();
    expect(scriptSrcLine).toContain("'wasm-unsafe-eval'");
  });

  it('[2] script-src NO incluye "unsafe-eval" (sería demasiado permisivo — habilitaría eval/Function)', () => {
    const scriptSrcLine = csp.split('\n').find((l) => l.includes('script-src')) ?? '';
    // 'unsafe-eval' como token aislado. 'wasm-unsafe-eval' está OK y debe estar.
    // Regex: 'unsafe-eval' precedido por espacio y seguido por espacio/comilla — sin 'wasm-' delante.
    expect(scriptSrcLine).not.toMatch(/(?<!wasm-)'unsafe-eval'/);
  });

  it('[3] CSP NO permite cdn.jsdelivr.net (worker/core OCR son self-hosted)', () => {
    expect(csp).not.toMatch(/cdn\.jsdelivr\.net/);
  });

  it('[3b] CSP NO permite unpkg.com', () => {
    expect(csp).not.toMatch(/unpkg\.com/);
  });

  it('[3c] CSP NO permite tessdata.projectnaptha.com', () => {
    expect(csp).not.toMatch(/tessdata\.projectnaptha\.com/);
  });

  it('[4] cambio justificado con comment explicativo encima de script-src', () => {
    // El comentario debe mencionar wasm-unsafe-eval para que futuros mantenedores
    // entiendan por qué está esa palabra extra en la directiva.
    expect(source).toMatch(/wasm-unsafe-eval[\s\S]{0,200}WebAssembly|WebAssembly[\s\S]{0,200}wasm-unsafe-eval/);
  });
});
