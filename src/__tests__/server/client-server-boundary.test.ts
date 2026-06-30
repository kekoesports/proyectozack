/**
 * Auditoría estática de la frontera cliente/servidor.
 *
 * Garantiza que ningún archivo con `'use client'` importe directamente
 * de módulos server-only:
 *   - @/lib/env
 *   - @/lib/db
 *   - @/lib/auth
 *   - Archivos en lib/queries/ que importan db/env
 *
 * Esto previene la regresión del incidente 2026-06-30 en /admin/finanzas/resumen:
 *   FinanceMonthlyControl (client) → financeResumen → db → env
 *   ↓
 *   "Attempted to access a server-side environment variable on the client"
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

function isClientComponent(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Match `'use client'` o `"use client"` en las primeras 5 líneas (puede haber comments)
  const head = content.split('\n').slice(0, 5).join('\n');
  return /^['"]use client['"];?/m.test(head);
}

function getValueImports(content: string): string[] {
  // Extrae paths de imports que NO son `import type`.
  const imports: string[] = [];
  const re = /^import\s+(?!type\s)[^'"]*from\s+['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const p = m[1];
    if (p) imports.push(p);
  }
  // Side-effect imports: `import 'foo'`
  const sideRe = /^import\s+['"]([^'"]+)['"]/gm;
  while ((m = sideRe.exec(content)) !== null) {
    const p = m[1];
    if (p) imports.push(p);
  }
  return imports;
}

const SERVER_ONLY_PATHS = [
  '@/lib/env',
  '@/lib/db',
  '@/lib/auth',
  '@/lib/auth-guard',
];

describe('Client/Server boundary — client components no importan modules server-only', () => {
  const clientFiles = allFiles.filter(isClientComponent);

  it('hay client components detectados (sanity check)', () => {
    expect(clientFiles.length).toBeGreaterThan(0);
  });

  it('ningún client component importa @/lib/env, @/lib/db, @/lib/auth, @/lib/auth-guard', () => {
    const offenders: { file: string; bad: string }[] = [];
    for (const file of clientFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const imports = getValueImports(content);
      for (const imp of imports) {
        if (SERVER_ONLY_PATHS.includes(imp)) {
          offenders.push({ file: path.relative(PROJECT_ROOT, file), bad: imp });
        }
      }
    }

    // Excepción documentada: ConsentedScripts solo accede a env.NEXT_PUBLIC_GTM_ID
    // (variable client del schema). El proxy de t3-env lo permite.
    const allowedOffenders = new Set([
      'src/components/layout/ConsentedScripts.tsx',
    ].map((p) => p.replace(/\\/g, '/')));

    const filtered = offenders.filter(
      (o) => !allowedOffenders.has(o.file.replace(/\\/g, '/')),
    );

    expect(filtered).toEqual([]);
  });

  it('financeResumen.ts (server-only) está protegido con import \'server-only\'', () => {
    const file = path.join(SRC_ROOT, 'lib', 'queries', 'financeDashboard', 'financeResumen.ts');
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/^\s*import\s+['"]server-only['"]/m);
  });

  it('financeResumen.shared.ts existe y NO importa @/lib/db ni @/lib/env', () => {
    const file = path.join(SRC_ROOT, 'lib', 'queries', 'financeDashboard', 'financeResumen.shared.ts');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).not.toMatch(/from\s+['"]@\/lib\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@\/lib\/env['"]/);
    expect(content).not.toMatch(/from\s+['"]@\/lib\/auth/);
  });
});
