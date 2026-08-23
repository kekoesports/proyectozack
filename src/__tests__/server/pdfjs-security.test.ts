import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

const SERVER_PARSER = fs.readFileSync(
  path.join(ROOT, 'src', 'lib', 'parsers', 'pdf.ts'),
  'utf8',
);
const CLIENT_OCR = fs.readFileSync(
  path.join(ROOT, 'src', 'features', 'admin', 'finance-payroll', 'client-ocr', 'runClientOcr.ts'),
  'utf8',
);
const SELF_HOSTED_WORKER = fs.readFileSync(
  path.join(ROOT, 'public', 'tessdata', 'pdf.worker.min.mjs'),
  'utf8',
);
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  overrides?: Record<string, string>;
};

describe('PDF.js security baseline', () => {
  it('no carga el visor ni el gestor de scripting para extraer o renderizar PDFs', () => {
    for (const source of [SERVER_PARSER, CLIENT_OCR]) {
      expect(source).not.toMatch(/pdf_viewer|PDFScriptingManager|AnnotationLayer/);
    }
  });

  it('fija versiones corregidas para PDF.js, su worker y js-yaml', () => {
    expect(PACKAGE.dependencies?.['pdfjs-dist']).toBe('^6.2.108');
    expect(PACKAGE.overrides?.['js-yaml']).toBe('4.3.1');
    expect(SELF_HOSTED_WORKER).toContain('6.2.108');
  });
});
