/**
 * Tests estáticos para PR C/3 del resumen V2:
 *   - Selector `from` / `to` en `/admin/finanzas/resumen`.
 *   - Bloque de pendientes destacados (top 5 + margen pendiente estimado).
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(PROJECT_ROOT, rel));
}

// ── page.tsx ──────────────────────────────────────────────────────────────

describe('[Resumen V2 · PR C] /admin/finanzas/resumen/page.tsx', () => {
  const src = read('src/app/admin/(dashboard)/finanzas/resumen/page.tsx');

  it('acepta searchParams (Promise) y extrae from / to', () => {
    expect(src).toMatch(/searchParams\?:\s*Promise<Record<string/);
    expect(src).toMatch(/firstParam\(sp\.from\)/);
    expect(src).toMatch(/firstParam\(sp\.to\)/);
  });

  it('valida from / to con regex ISO YYYY-MM-DD antes de pasarlas a la query', () => {
    expect(src).toMatch(/\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//);
    expect(src).toMatch(/safeIsoDate\(/);
  });

  it('pasa from / to a getFinanzasResumenV2', () => {
    expect(src).toMatch(/getFinanzasResumenV2\s*\(\s*\{/);
    // El spread condicional evita mandar undefined al filtro.
    expect(src).toMatch(/\.\.\.\(from \? \{ from \} : \{\}\)/);
    expect(src).toMatch(/\.\.\.\(to \? \{ to \} : \{\}\)/);
  });

  it('renderiza ResumenFilters con `applied` y `defaults`', () => {
    expect(src).toMatch(/<ResumenFilters\s+applied=\{data\.period\}\s+defaults=\{defaults\}/);
  });

  it('renderiza ResumenPendientesBlock', () => {
    expect(src).toMatch(/<ResumenPendientesBlock\s+pendientes=\{data\.pendientes\}/);
  });

  it("no declara 'use client'", () => {
    expect(src.split('\n')[0]?.trim()).not.toBe("'use client';");
    expect(src).not.toMatch(/^['"]use client['"];/m);
  });
});

// ── ResumenFilters ────────────────────────────────────────────────────────

describe('[Resumen V2 · PR C] ResumenFilters', () => {
  const rel = 'src/features/admin/finance-dashboard/components/resumen-v2/ResumenFilters.tsx';

  it('existe', () => { expect(exists(rel)).toBe(true); });

  const src = read(rel);

  it("declara 'use client' en la primera línea", () => {
    expect(src.split('\n')[0]?.trim()).toBe("'use client';");
  });

  it('usa useRouter + useSearchParams + useTransition', () => {
    expect(src).toMatch(/useRouter/);
    expect(src).toMatch(/useSearchParams/);
    expect(src).toMatch(/useTransition/);
  });

  it('navega a /admin/finanzas/resumen preservando o limpiando query string', () => {
    expect(src).toMatch(/router\.push\([^)]*\/admin\/finanzas\/resumen/);
  });

  it('acepta inputs type="date" para from y to', () => {
    expect(src).toMatch(/type="date"/);
  });

  it('botón "Restablecer" cuando el rango ya no es el default (YTD)', () => {
    expect(src).toMatch(/Restablecer/);
  });
});

// ── ResumenPendientesBlock ────────────────────────────────────────────────

describe('[Resumen V2 · PR C] ResumenPendientesBlock', () => {
  const rel = 'src/features/admin/finance-dashboard/components/resumen-v2/ResumenPendientesBlock.tsx';

  it('existe', () => { expect(exists(rel)).toBe(true); });

  const src = read(rel);

  it("no declara 'use client' (Server Component)", () => {
    expect(src.split('\n')[0]?.trim()).not.toBe("'use client';");
    expect(src).not.toMatch(/^['"]use client['"];/m);
  });

  it('sin useState / useEffect', () => {
    expect(src).not.toMatch(/useState\(/);
    expect(src).not.toMatch(/useEffect\(/);
  });

  it('renderiza las 3 columnas: cobros campañas, pagos talento, pagos operativo', () => {
    expect(src).toMatch(/Pendiente de cobro \(campañas\)/);
    expect(src).toMatch(/Pendiente de pago a talentos/);
    expect(src).toMatch(/Pendiente de pago operativo/);
  });

  it('cada columna enlaza a /admin/finanzas/cobros o /admin/finanzas/gastos vía <Link>', () => {
    expect(src).toMatch(/import\s+Link\s+from\s+['"]next\/link['"]/);
    expect(src).toMatch(/href="\/admin\/finanzas\/cobros"/);
    expect(src).toMatch(/href="\/admin\/finanzas\/gastos"/);
  });

  it('muestra "Margen pendiente estimado"', () => {
    expect(src).toMatch(/Margen pendiente estimado/);
  });

  it('marca vencidas con "vencida hace Nd" cuando daysOverdue > 0', () => {
    expect(src).toMatch(/vencida hace \{item\.daysOverdue\}d/);
  });

  it('empty state "Al día ✓" cuando el bucket no tiene items', () => {
    expect(src).toMatch(/Al día/);
  });
});

// ── Anti-scope-creep ─────────────────────────────────────────────────────

describe('[Resumen V2 · PR C] anti-scope-creep', () => {
  const files = [
    'src/app/admin/(dashboard)/finanzas/resumen/page.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenFilters.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenPendientesBlock.tsx',
  ];

  it.each(files)('%s no importa Resend/emails/dunning/invoice_reminders', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/from\s+['"]resend['"]/);
    expect(src).not.toMatch(/@\/lib\/email/);
    expect(src).not.toMatch(/sendEmail/);
    expect(src).not.toMatch(/invoice_reminders/);
    expect(src).not.toMatch(/dunning/i);
  });

  it.each(files)('%s no define ni altera tablas', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/pgTable\s*\(/);
    expect(src).not.toMatch(/alterTable/);
  });
});
