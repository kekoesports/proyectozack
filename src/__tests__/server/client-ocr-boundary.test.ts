/**
 * Auditoría estática del nuevo OCR cliente:
 *
 *   - `tesseract.js` y `pdfjs-dist` solo se cargan vía dynamic import
 *     en `client-ocr/runClientOcr.ts`.
 *   - Ningún Server Action importa `tesseract.js` (los actions del
 *     wizard quedan inertes detrás del kill switch PAYROLL_OCR_ENABLED).
 *   - Ningún componente general de Finanzas (resumen, herramientas,
 *     dashboard, etc.) carga el módulo client-ocr.
 *
 * Si alguien añade un `import 'tesseract.js'` estático fuera de la
 * carpeta client-ocr, este test reventará en CI.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC_ROOT = path.join(PROJECT_ROOT, 'src');

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '__tests__') continue;
      walk(full, files);
    } else if (/\.tsx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk(SRC_ROOT);

function rel(file: string): string {
  return path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
}

function hasStaticImport(content: string, pkg: string): boolean {
  // Coincide con `import X from 'pkg'`, `import 'pkg'`, `import { X } from 'pkg'`.
  const esc = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^import\\s+(?:[^'"\\n]+\\s+from\\s+)?['"]${esc}['"]`, 'm');
  return re.test(content);
}

function hasDynamicImport(content: string, pkg: string): boolean {
  const esc = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`import\\(['"]${esc}['"]\\)`);
  return re.test(content);
}

// Whitelist: archivos donde el static import de tesseract.js/pdfjs-dist
// es legítimo. El server payrollOcr.ts queda inerte detrás del kill switch
// pero su dynamic import legado dentro de la función sigue ahí — el módulo
// como tal no se ejecuta cuando el flag está off (return early).
const ALLOWED_TESSERACT_FILES = new Set<string>([
  // Solo dynamic import dentro del archivo, no static.
  // Si alguien añade un import estático, los tests bajo fallarán.
]);

describe('Client OCR — boundaries estáticas', () => {
  it('[1] tesseract.js NUNCA se importa estáticamente fuera del módulo client-ocr', () => {
    const offenders: string[] = [];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (!hasStaticImport(content, 'tesseract.js')) continue;
      const r = rel(file);
      if (ALLOWED_TESSERACT_FILES.has(r)) continue;
      offenders.push(r);
    }
    expect(offenders).toEqual([]);
  });

  it('[2] ningún Server Action ni server-only file importa estáticamente tesseract.js', () => {
    // Server Actions = archivos con 'use server' al inicio.
    // server-only = archivos con import 'server-only' o legacy 'server-only' literal.
    const offenders: string[] = [];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const isServerAction = /^['"]use server['"];/m.test(content);
      const isServerOnly = /import\s+['"]server-only['"]/.test(content)
        || /^['"]server-only['"];/m.test(content);
      if (!isServerAction && !isServerOnly) continue;
      if (hasStaticImport(content, 'tesseract.js')) {
        offenders.push(rel(file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('runClientOcr.ts existe, marca \'use client\' y NO usa static import de tesseract.js', () => {
    const file = path.join(SRC_ROOT, 'features', 'admin', 'finance-payroll', 'client-ocr', 'runClientOcr.ts');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/^['"]use client['"];/);
    expect(hasStaticImport(content, 'tesseract.js')).toBe(false);
    expect(hasStaticImport(content, 'pdfjs-dist')).toBe(false);
    // Pero sí debe usar dynamic import de ambas
    expect(hasDynamicImport(content, 'tesseract.js')).toBe(true);
    expect(hasDynamicImport(content, 'pdfjs-dist')).toBe(true);
  });

  it('PayrollImportWizard.tsx no importa estáticamente runClientOcr (debe ser dynamic)', () => {
    const file = path.join(SRC_ROOT, 'features', 'admin', 'finance-payroll', 'PayrollImportWizard.tsx');
    const content = fs.readFileSync(file, 'utf-8');
    // No debe haber `import { runClientOcr } from './client-ocr/runClientOcr'`
    expect(content).not.toMatch(/^import\s+\{[^}]*runClientOcr[^}]*\}\s+from/m);
    expect(content).not.toMatch(/^import\s+runClientOcr\s+from/m);
    // Sí debe haber dynamic import
    expect(content).toMatch(/import\(['"]\.\/client-ocr\/runClientOcr['"]\)/);
  });

  it('[3] /admin/finanzas/resumen y otras páginas finance generales NO cargan client-ocr', () => {
    const FINANCE_GENERAL_PATHS = [
      path.join(SRC_ROOT, 'app', 'admin', '(dashboard)', 'finanzas', 'resumen'),
      path.join(SRC_ROOT, 'app', 'admin', '(dashboard)', 'finanzas', 'herramientas'),
      path.join(SRC_ROOT, 'app', 'admin', '(dashboard)', 'finanzas', 'dashboard'),
      path.join(SRC_ROOT, 'features', 'admin', 'finance-dashboard'),
    ];
    const offenders: string[] = [];
    for (const dir of FINANCE_GENERAL_PATHS) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.statSync(dir).isDirectory() ? walk(dir) : [dir];
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        if (/client-ocr/.test(content) || hasStaticImport(content, 'tesseract.js') || hasStaticImport(content, 'pdfjs-dist')) {
          offenders.push(rel(f));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
