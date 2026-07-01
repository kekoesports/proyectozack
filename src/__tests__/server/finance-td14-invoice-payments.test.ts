/**
 * Verifica que las queries de Finanzas migradas usan `invoice_payments`
 * como fuente canónica y no leen `invoices.paidAmount` deprecated.
 *
 * Excepción documentada: `src/lib/queries/invoices.ts` (`listInvoices()`)
 * sigue seleccionando la column por compatibilidad — ver TD-14b en
 * `docs/tech-debt.md`.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

/** Devuelve solo las líneas que no sean docstrings ni comentarios de línea. */
function codeOnly(src: string): string {
  return src
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith('*') && !t.startsWith('//') && !t.startsWith('/*');
    })
    .join('\n');
}

// ── receivables.ts ────────────────────────────────────────────────────────

describe('[TD-14] receivables.ts', () => {
  const src = read('src/lib/queries/financeDashboard/receivables.ts');
  const code = codeOnly(src);

  it('no lee invoices.paidAmount en código (solo permitido en comentarios)', () => {
    expect(code).not.toMatch(/invoices\.paidAmount/);
  });

  it('usa invoice_payments como fuente canónica en el internal path', () => {
    expect(src).toMatch(/leftJoin\(\s*invoicePayments/);
    expect(src).toMatch(/SUM\(\$\{invoicePayments\.amount\}\)/);
  });

  it('mantiene el patrón COALESCE(SUM(...), 0)::text (idéntico al issued path)', () => {
    const matches = src.match(/COALESCE\(SUM\(\$\{invoicePayments\.amount\}\)/g);
    // Uno para issued + uno para internal.
    expect(matches?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('agrupa por columnas no-agregadas cuando calcula paidAmount', () => {
    expect(src).toMatch(/groupBy\(/);
  });
});

// ── pnl.ts (dead SELECT limpiado) ─────────────────────────────────────────

describe('[TD-14] pnl.ts', () => {
  const src = read('src/lib/queries/pnl.ts');
  const code = codeOnly(src);

  it('ya no selecciona invoices.paidAmount (dead code eliminado)', () => {
    expect(code).not.toMatch(/paidAmount:\s*invoices\.paidAmount/);
    // Y por buena medida, no referencia paidAmount en absoluto en el código.
    expect(code).not.toMatch(/\.paidAmount/);
  });
});

// ── Queries canónicas ya migradas (regresión) ─────────────────────────────

describe('[TD-14] queries canónicas siguen sin leer invoices.paidAmount', () => {
  const files = [
    'src/lib/queries/financeDashboard/arAging.ts',
    'src/lib/queries/financeDashboard/finanzasResumenV2.ts',
    'src/lib/queries/financeDashboard/receivables.ts',
    'src/lib/queries/pnl.ts',
  ];

  it.each(files)('%s no lee invoices.paidAmount en código', (rel) => {
    const code = codeOnly(read(rel));
    expect(code).not.toMatch(/invoices\.paidAmount/);
  });
});

// ── Excepción documentada ────────────────────────────────────────────────

describe('[TD-14] excepción documentada — listInvoices() sigue en TD-14b', () => {
  it('src/lib/queries/invoices.ts sigue leyendo paidAmount column (documentado como residual)', () => {
    // Este test protege el estado actual: no queremos que alguien migre
    // parcialmente `listInvoices()` sin planificarlo. Si algún día se migra,
    // se debe actualizar TD-14b y este test.
    const src = read('src/lib/queries/invoices.ts');
    expect(src).toMatch(/paidAmount:\s*invoices\.paidAmount/);
  });

  it('docs/tech-debt.md refleja TD-14 corregido y TD-14b como residual', () => {
    const doc = read('docs/tech-debt.md');
    expect(doc).toMatch(/TD-14 .*CORREGIDO/i);
    expect(doc).toMatch(/TD-14b/);
    expect(doc).toMatch(/listInvoices/);
  });
});

// ── Anti-scope-creep ─────────────────────────────────────────────────────

describe('[TD-14] anti-scope-creep', () => {
  const filesTouched = [
    'src/lib/queries/financeDashboard/receivables.ts',
    'src/lib/queries/pnl.ts',
  ];

  it.each(filesTouched)('%s no importa Resend/emails/dunning/invoice_reminders', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/from\s+['"]resend['"]/);
    expect(src).not.toMatch(/@\/lib\/email/);
    expect(src).not.toMatch(/sendEmail/);
    expect(src).not.toMatch(/invoice_reminders/);
    expect(src).not.toMatch(/dunning/i);
  });

  it.each(filesTouched)('%s no define ni altera tablas', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/pgTable\s*\(/);
    expect(src).not.toMatch(/alterTable/);
  });
});
