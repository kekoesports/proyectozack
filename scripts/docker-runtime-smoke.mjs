/**
 * Smoke test de las dependencias nativas y WASM que usa el CRM en el VPS.
 *
 * Se ejecuta contra la imagen final, no contra el checkout, para detectar si
 * el trazado standalone de Next omitió un módulo o una librería compartida.
 * No usa red, base de datos ni datos reales.
 */

import * as mupdf from 'mupdf';
import { createWorker } from 'tesseract.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class DOMMatrixStub {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  m11 = 1; m12 = 0; m13 = 0; m14 = 0;
  m21 = 0; m22 = 1; m23 = 0; m24 = 0;
  m31 = 0; m32 = 0; m33 = 1; m34 = 0;
  m41 = 0; m42 = 0; m43 = 0; m44 = 1;
  is2D = true;
  isIdentity = true;
  static fromMatrix() { return new DOMMatrixStub(); }
  static fromFloat32Array() { return new DOMMatrixStub(); }
  static fromFloat64Array() { return new DOMMatrixStub(); }
  multiply() { return this; }
  inverse() { return this; }
  translate() { return this; }
  scale() { return this; }
  rotate() { return this; }
  toFloat32Array() { return new Float32Array(16); }
  toFloat64Array() { return new Float64Array(16); }
  toJSON() { return {}; }
  toString() { return 'matrix(1, 0, 0, 1, 0, 0)'; }
}

globalThis.DOMMatrix ??= DOMMatrixStub;

// PDF sintético sin datos reales, generado con el mismo MuPDF que usa el OCR
// del servidor. Evita depender de canvas/jsPDF, que solo participan en rutas
// de navegador y no deben inflar ni condicionar la imagen standalone.
const sourceDocument = new mupdf.PDFDocument();
const sourceFont = new mupdf.Font('Helvetica');
const sourceFontRef = sourceDocument.addSimpleFont(sourceFont);
const sourcePage = sourceDocument.addPage(
  [0, 0, 595, 842],
  0,
  { Font: { F1: sourceFontRef } },
  'BT /F1 42 Tf 72 690 Td (SOCIALPRO 2026) Tj ET',
);
sourceDocument.insertPage(-1, sourcePage);
const sourceBuffer = sourceDocument.saveToBuffer();
const pdfBytes = sourceBuffer.asUint8Array().slice();
sourceBuffer.destroy();
sourcePage.destroy();
sourceFontRef.destroy();
sourceFont.destroy();
sourceDocument.destroy();

await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsDocument = await getDocument({
  // pdfjs transfiere y separa el ArrayBuffer recibido. Mantener el original
  // para que MuPDF pueda abrir la misma muestra después.
  data: pdfBytes.slice(),
  disableFontFace: true,
  useSystemFonts: false,
  isEvalSupported: false,
}).promise;
const pdfjsPage = await pdfjsDocument.getPage(1);
const textContent = await pdfjsPage.getTextContent();
const extractedText = textContent.items
  .filter((item) => 'str' in item)
  .map((item) => item.str)
  .join(' ');
assert(extractedText.includes('SOCIALPRO 2026'), 'pdfjs no extrajo el texto esperado');
pdfjsPage.cleanup();
await pdfjsDocument.destroy();

const mupdfDocument = mupdf.Document.openDocument(pdfBytes, 'application/pdf');
assert(mupdfDocument.countPages() === 1, 'MuPDF no abrió el PDF sintético');
const mupdfPage = mupdfDocument.loadPage(0);
const pixmap = mupdfPage.toPixmap(
  mupdf.Matrix.scale(3, 3),
  mupdf.ColorSpace.DeviceRGB,
  false,
  true,
);
const renderedPng = Buffer.from(pixmap.asPNG());
assert(renderedPng.length > 5_000, 'MuPDF no renderizó un PNG válido');
pixmap.destroy();
mupdfPage.destroy();
mupdfDocument.destroy();

const worker = await createWorker(['spa', 'eng'], 1, {
  langPath: process.cwd(),
  logger: () => {},
});
try {
  const { data } = await worker.recognize(renderedPng);
  assert(data.text.trim().length > 0, 'Tesseract no reconoció texto en el PDF sintético');
} finally {
  await worker.terminate();
}

console.log('docker-runtime-smoke: ok');
