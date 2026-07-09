/**
 * Garantía estática: la feature `libro-mayor` NUNCA escribe en DB, NUNCA
 * llama a Server Actions, NUNCA crea invoices/expenses/payrolls.
 *
 * Este test es la línea roja de la PR 1 — cualquier PR que rompa esta
 * garantía requiere una discusión explícita antes.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FEATURE_ROOT = path.join(ROOT, 'src/features/libro-mayor');
const PAGE_FILE = path.join(ROOT, 'src/app/admin/(dashboard)/finanzas/contabilidad/page.tsx');

function walk(dir: string, out: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

function read(fp: string): string {
  return fs.readFileSync(fp, 'utf-8');
}

describe('libro-mayor — no writes', () => {
  const files = walk(FEATURE_ROOT).concat(PAGE_FILE);

  it('ningún archivo importa `db` de @/lib/db', () => {
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/db['"]/);
    }
  });

  it('ningún archivo importa nada de @/db/schema', () => {
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/from\s+['"]@\/db\/schema/);
    }
  });

  it('ningún archivo llama db.insert / db.update / db.delete', () => {
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/\bdb\.insert\s*\(/);
      expect(src).not.toMatch(/\bdb\.update\s*\(/);
      expect(src).not.toMatch(/\bdb\.delete\s*\(/);
    }
  });

  it('ningún archivo declara "use server"', () => {
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/^\s*['"]use server['"]/m);
    }
  });

  it('ningún archivo llama revalidatePath / revalidateTag', () => {
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/\brevalidatePath\s*\(/);
      expect(src).not.toMatch(/\brevalidateTag\s*\(/);
    }
  });

  it('ningún archivo importa @/lib/queries de facturación/expenses/payrolls', () => {
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/queries\/invoices/);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/queries\/expenses/);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/queries\/payrolls/);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/queries\/facturacion/);
    }
  });

  it('la página guardada con requirePermission("contabilidad", "read")', () => {
    const src = read(PAGE_FILE);
    expect(src).toMatch(/requirePermission\s*\(\s*['"]contabilidad['"]\s*,\s*['"]read['"]\s*\)/);
  });
});
