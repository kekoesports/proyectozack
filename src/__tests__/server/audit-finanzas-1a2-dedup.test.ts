/**
 * Tests estáticos para Fase 1A.2 de la auditoría:
 * deduplicación del dashboard financiero legacy.
 *
 * Decisión: `/admin/finanzas/resumen` es la única home financiera.
 * `/admin/facturacion/dashboard` redirige de forma permanente (308).
 *
 * Cubre:
 *   1. Redirect activo con permanentRedirect → /admin/finanzas/resumen
 *   2. Los 4 componentes legacy huérfanos ya no existen en el filesystem
 *   3. AdminSidebar no enlaza a /admin/facturacion/dashboard
 *   4. /admin/finanzas/resumen sigue intacto (control mensual + queries)
 *   5. Cero scope creep: sin schema/migration/cron/Resend nuevos
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

describe('[Fase 1A.2] Deduplicación dashboard financiero — verificación estática', () => {
  // ── 1. Redirect ────────────────────────────────────────────────────────────

  describe('/admin/facturacion/dashboard redirige a /admin/finanzas/resumen', () => {
    const src = read('src/app/admin/(dashboard)/facturacion/dashboard/page.tsx');

    it('importa permanentRedirect (o redirect) desde next/navigation', () => {
      expect(src).toMatch(
        /import\s+\{\s*(permanentRedirect|redirect)\s*\}\s+from\s+['"]next\/navigation['"]/,
      );
    });

    it('llama a permanentRedirect/redirect con /admin/finanzas/resumen', () => {
      expect(src).toMatch(
        /(permanentRedirect|redirect)\(\s*['"]\/admin\/finanzas\/resumen['"]\s*\)/,
      );
    });

    it('no importa ninguno de los 4 componentes legacy huérfanos', () => {
      expect(src).not.toMatch(/FinanceKPIGrid/);
      expect(src).not.toMatch(/CashflowChart/);
      expect(src).not.toMatch(/ReconciliationPanel/);
      expect(src).not.toMatch(/CampaignMarginsTable/);
    });

    it('no invoca getFinanceDashboard() en la página legacy (redirect puro)', () => {
      expect(src).not.toMatch(/getFinanceDashboard\s*\(/);
    });
  });

  // ── 2. Componentes huérfanos borrados ──────────────────────────────────────

  describe('Los 4 componentes legacy huérfanos han sido borrados', () => {
    const orphans = [
      'src/features/admin/finance-dashboard/components/FinanceKPIGrid.tsx',
      'src/features/admin/finance-dashboard/components/CashflowChart.tsx',
      'src/features/admin/finance-dashboard/components/ReconciliationPanel.tsx',
      'src/features/admin/finance-dashboard/components/CampaignMarginsTable.tsx',
    ] as const;

    it.each(orphans)('no existe: %s', (rel) => {
      expect(exists(rel)).toBe(false);
    });
  });

  // ── 3. Sidebar / nav no enlaza a la ruta legacy ────────────────────────────

  describe('Navegación del admin no enlaza a /admin/facturacion/dashboard', () => {
    const layout = read('src/app/admin/(dashboard)/layout.tsx');
    const finanzasNav = read('src/app/admin/(dashboard)/finanzas/FinanzasNav.tsx');

    it('layout admin (primaryNav + moreNav) no contiene el href legacy', () => {
      expect(layout).not.toMatch(/\/admin\/facturacion\/dashboard/);
    });

    it('FinanzasNav (tabs internos) no enlaza al dashboard legacy', () => {
      expect(finanzasNav).not.toMatch(/\/admin\/facturacion\/dashboard/);
    });

    it('layout admin sí enlaza a /admin/finanzas/resumen (home financiera)', () => {
      expect(layout).toMatch(/\/admin\/finanzas\/resumen/);
    });
  });

  // ── 4. /admin/finanzas/resumen intacto ─────────────────────────────────────

  describe('/admin/finanzas/resumen sigue siendo la home financiera funcional', () => {
    const resumen = read('src/app/admin/(dashboard)/finanzas/resumen/page.tsx');

    it('mantiene requirePermission("facturacion", "read")', () => {
      expect(resumen).toMatch(
        /requirePermission\(\s*['"]facturacion['"]\s*,\s*['"]read['"]\s*\)/,
      );
    });

    it('renderiza FinanceMonthlyControl', () => {
      expect(resumen).toMatch(/FinanceMonthlyControl/);
    });

    it('sigue invocando las queries del control mensual', () => {
      expect(resumen).toMatch(/getMonthlyFinanceFlow/);
      expect(resumen).toMatch(/getFinanceStockKPIs/);
      expect(resumen).toMatch(/getMonthlyExpenseBreakdown/);
      expect(resumen).toMatch(/getMonthlyDocs/);
    });

    it('sigue invocando getFinanceDashboard() para alerts + receivables', () => {
      expect(resumen).toMatch(/getFinanceDashboard\s*\(/);
    });

    it('pasa alerts y receivables como props al FinanceMonthlyControl', () => {
      expect(resumen).toMatch(/alerts=\{dashboard\.alerts\}/);
      expect(resumen).toMatch(/receivables=\{dashboard\.receivables\}/);
    });
  });

  // ── 5. Sin scope creep ─────────────────────────────────────────────────────

  describe('Cero scope creep (sin DB/schema/cron/Resend/migrations)', () => {
    const legacyPage = read('src/app/admin/(dashboard)/facturacion/dashboard/page.tsx');

    it('la página legacy no importa @/db/schema ni drizzle', () => {
      expect(legacyPage).not.toMatch(/@\/db\/schema/);
      expect(legacyPage).not.toMatch(/drizzle-orm/);
    });

    it('la página legacy no importa Resend ni utilidades de email', () => {
      expect(legacyPage).not.toMatch(/from\s+['"]resend['"]/);
      expect(legacyPage).not.toMatch(/@\/lib\/email/);
    });

    it('el agregador getFinanceDashboard sigue exportado (no se rompe alerts + AI tools)', () => {
      const index = read('src/lib/queries/financeDashboard/index.ts');
      expect(index).toMatch(/export\s+async\s+function\s+getFinanceDashboard/);
      expect(index).toMatch(/deriveAlerts/);
    });
  });
});
