/**
 * Tests estáticos para la UI del nuevo `/admin/finanzas/resumen` (PR B/3).
 *
 * Cubre:
 *   - `page.tsx` nuevo llama a `getFinanzasResumenV2()` y renderiza los 6 bloques.
 *   - El resumen mensual actual se mueve a `/admin/finanzas/mes`.
 *   - FinanzasNav incluye tab "Resumen" y "Control mensual" con href `/mes`.
 *   - Los 6 componentes de bloques existen como Server Components (sin
 *     `'use client'`, sin `useState`, sin `useEffect`).
 *   - Anti-scope-creep: sin schema/cron/Resend/emails.
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

// ── Nuevo /admin/finanzas/resumen ─────────────────────────────────────────

describe('[Resumen V2] /admin/finanzas/resumen', () => {
  const resumenSrc = read('src/app/admin/(dashboard)/finanzas/resumen/page.tsx');

  it('requirePermission("facturacion", "read")', () => {
    expect(resumenSrc).toMatch(/requirePermission\(\s*['"]facturacion['"]\s*,\s*['"]read['"]\s*\)/);
  });

  it('importa y llama a getFinanzasResumenV2()', () => {
    expect(resumenSrc).toMatch(/from\s+['"]@\/lib\/queries\/financeDashboard\/finanzasResumenV2['"]/);
    expect(resumenSrc).toMatch(/getFinanzasResumenV2\s*\(/);
  });

  it('renderiza los 6 bloques', () => {
    expect(resumenSrc).toMatch(/ResumenIngresosBlock/);
    expect(resumenSrc).toMatch(/ResumenCostesMargenBlock/);
    expect(resumenSrc).toMatch(/ResumenNominasBlock/);
    expect(resumenSrc).toMatch(/ResumenImpuestosBlock/);
    expect(resumenSrc).toMatch(/ResumenOperativosBlock/);
    expect(resumenSrc).toMatch(/ResumenResultadoBlock/);
  });

  it("no declara 'use client'", () => {
    expect(resumenSrc.split('\n')[0]?.trim()).not.toBe("'use client';");
    expect(resumenSrc).not.toMatch(/^['"]use client['"];/m);
  });
});

// ── Resumen mensual movido a /admin/finanzas/mes ──────────────────────────

describe('[Resumen V2] /admin/finanzas/mes (mensual)', () => {
  it('existe la página en la nueva ubicación', () => {
    expect(exists('src/app/admin/(dashboard)/finanzas/mes/page.tsx')).toBe(true);
  });

  it('el mensual sigue usando FinanceMonthlyControl', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/mes/page.tsx');
    expect(src).toMatch(/FinanceMonthlyControl/);
    expect(src).toMatch(/getMonthlyFinanceFlow/);
    expect(src).toMatch(/getFinanceStockKPIs/);
    expect(src).toMatch(/getFinanceDashboard/);
  });

  it('MonthSelector navega a /admin/finanzas/mes (no al viejo resumen)', () => {
    const src = read('src/features/admin/finance-dashboard/components/FinanceMonthlyControl.tsx');
    expect(src).toMatch(/\/admin\/finanzas\/mes/);
    expect(src).not.toMatch(/\/admin\/finanzas\/resumen\?mes=/);
  });
});

// ── FinanzasNav ────────────────────────────────────────────────────────────

describe('[Resumen V2] FinanzasNav', () => {
  const nav = read('src/app/admin/(dashboard)/finanzas/FinanzasNav.tsx');

  it('incluye tab "Resumen" con href /admin/finanzas/resumen', () => {
    expect(nav).toMatch(/href:\s*['"]\/admin\/finanzas\/resumen['"]/);
    expect(nav).toMatch(/label:\s*['"]Resumen['"]/);
  });

  // PR 2 rediseño 2026-07-06: "Control mensual" ya no es tab canónica.
  // La ruta /admin/finanzas/mes sigue funcional y accesible por URL directa
  // o desde enlaces internos, pero no aparece en FinanzasNav. Ver
  // docs/finanzas-audit.md §14.
});

// ── Componentes de bloques ────────────────────────────────────────────────

describe('[Resumen V2] componentes de bloques', () => {
  const blocks = [
    'src/features/admin/finance-dashboard/components/resumen-v2/SectionCard.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenIngresosBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenCostesMargenBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenNominasBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenImpuestosBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenOperativosBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenResultadoBlock.tsx',
  ];

  it.each(blocks)('%s existe', (rel) => {
    expect(exists(rel)).toBe(true);
  });

  it.each(blocks)('%s es Server Component (sin "use client", sin useState/useEffect)', (rel) => {
    const src = read(rel);
    expect(src.split('\n')[0]?.trim()).not.toBe("'use client';");
    expect(src).not.toMatch(/^['"]use client['"];/m);
    expect(src).not.toMatch(/useState\(/);
    expect(src).not.toMatch(/useEffect\(/);
  });
});

// ── revalidatePath incluye /mes ──────────────────────────────────────────

describe('[Resumen V2] revalidatePath actualizado', () => {
  it('finanzas-actions.ts revalida /admin/finanzas/mes', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/finanzas-actions.ts');
    expect(src).toMatch(/revalidatePath\(['"]\/admin\/finanzas\/mes['"]\)/);
  });

  it('setup-2026/actions.ts revalida /admin/finanzas/mes', () => {
    const src = read('src/app/admin/(dashboard)/finanzas/setup-2026/actions.ts');
    expect(src).toMatch(/revalidatePath\(['"]\/admin\/finanzas\/mes['"]\)/);
  });
});

// ── Anti-scope-creep ─────────────────────────────────────────────────────

describe('[Resumen V2] anti-scope-creep', () => {
  const files = [
    'src/app/admin/(dashboard)/finanzas/resumen/page.tsx',
    'src/app/admin/(dashboard)/finanzas/mes/page.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenIngresosBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenCostesMargenBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenNominasBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenImpuestosBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenOperativosBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenResultadoBlock.tsx',
  ];

  it.each(files)('%s no importa Resend/emails/dunning/invoice_reminders', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/from\s+['"]resend['"]/);
    expect(src).not.toMatch(/@\/lib\/email/);
    expect(src).not.toMatch(/sendEmail/);
    expect(src).not.toMatch(/invoice_reminders/);
    expect(src).not.toMatch(/dunning/i);
  });

  it('no se ha creado ninguna migration nueva para PR B', () => {
    const src = read('src/lib/queries/financeDashboard/finanzasResumenV2.ts');
    expect(src).not.toMatch(/pgTable\s*\(/);
    expect(src).not.toMatch(/alterTable/);
  });
});
