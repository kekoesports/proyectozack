/**
 * Responsive layout tests — verifies that main app areas render without
 * horizontal overflow on iPhone SE (375×667) and iPad (768×1024) viewports.
 *
 * Scope: routes NOT already covered by crm-fase6-responsive.spec.ts.
 * That file covers: /admin, /admin/campanas, /admin/tareas, /admin/facturacion,
 * /admin/pl, /admin/brands.
 *
 * This file covers:
 *  - Public routes: /, /talentos, /blog, /contacto, /nosotros, /servicios
 *  - Admin routes: /admin/talents, /admin/cases, /admin/equipo,
 *                  /admin/giveaways, /admin/targets
 *  - Brand portal: /marcas, /marcas/talentos, /marcas/propuestas, /marcas/facturas
 */
import { test, expect } from '@playwright/test';

import { expectNoHorizontalOverflow, gotoAdmin, gotoBrand } from './helpers';

// ── Viewport constants ────────────────────────────────────────────────────────

const IPHONE_SE = { width: 375, height: 667 };
const IPAD = { width: 768, height: 1024 };
const VIEWPORTS = [
  { label: 'iPhone SE', viewport: IPHONE_SE },
  { label: 'iPad', viewport: IPAD },
] as const;

// ── Public routes ─────────────────────────────────────────────────────────────

test.describe('Responsive — public routes', () => {
  for (const { label, viewport } of VIEWPORTS) {
    test.describe(`${label} (${viewport.width}×${viewport.height})`, () => {
      test.use({ viewport });

      test('/ — no horizontal overflow, main content visible', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });

      test('/talentos — no horizontal overflow', async ({ page }) => {
        await page.goto('/talentos', { waitUntil: 'domcontentloaded' });
        await expectNoHorizontalOverflow(page);
      });

      test('/blog — no horizontal overflow', async ({ page }) => {
        await page.goto('/blog', { waitUntil: 'domcontentloaded' });
        await expectNoHorizontalOverflow(page);
      });

      test('/contacto — no horizontal overflow', async ({ page }) => {
        await page.goto('/contacto', { waitUntil: 'domcontentloaded' });
        await expectNoHorizontalOverflow(page);
      });

      test('/nosotros — no horizontal overflow', async ({ page }) => {
        await page.goto('/nosotros', { waitUntil: 'domcontentloaded' });
        await expectNoHorizontalOverflow(page);
      });

      test('/servicios — no horizontal overflow', async ({ page }) => {
        await page.goto('/servicios', { waitUntil: 'domcontentloaded' });
        await expectNoHorizontalOverflow(page);
      });
    });
  }
});

// ── Admin routes (not in crm-fase6-responsive) ────────────────────────────────

test.describe('Responsive — admin routes', () => {
  for (const { label, viewport } of VIEWPORTS) {
    test.describe(`${label} (${viewport.width}×${viewport.height})`, () => {
      test.use({ viewport });

      test('/admin/talents — no overflow, h1 visible', async ({ page }) => {
        await gotoAdmin(page, 'talents');
        await expect(page.getByRole('heading', { level: 1, name: /roster/i })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });

      test('/admin/cases — no overflow, h1 visible', async ({ page }) => {
        await gotoAdmin(page, 'cases');
        await expect(page.getByRole('heading', { level: 1, name: /casos de éxito/i })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });

      test('/admin/equipo — no overflow, h1 visible', async ({ page }) => {
        await gotoAdmin(page, 'equipo');
        await expect(page.getByRole('heading', { level: 1, name: /equipo/i })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });

      test('/admin/giveaways — no overflow, h1 visible', async ({ page }) => {
        await gotoAdmin(page, 'giveaways');
        await expect(page.getByRole('heading', { level: 1, name: /giveaways/i })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });

      test('/admin/targets — no overflow, h1 visible', async ({ page }) => {
        await gotoAdmin(page, 'targets');
        await expect(page.getByRole('heading', { level: 1, name: /outreach/i })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });
    });
  }
});

// ── Brand portal ──────────────────────────────────────────────────────────────

test.describe('Responsive — brand portal', () => {
  for (const { label, viewport } of VIEWPORTS) {
    test.describe(`${label} (${viewport.width}×${viewport.height})`, () => {
      test.use({ viewport });

      test('/marcas — no overflow, h1 visible', async ({ page }) => {
        await gotoBrand(page);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });

      test('/marcas/talentos — no overflow', async ({ page }) => {
        await gotoBrand(page, 'talentos');
        await expectNoHorizontalOverflow(page);
      });

      test('/marcas/propuestas — no overflow', async ({ page }) => {
        await gotoBrand(page, 'propuestas');
        await expectNoHorizontalOverflow(page);
      });

      test('/marcas/facturas — no overflow', async ({ page }) => {
        await gotoBrand(page, 'facturas');
        await expectNoHorizontalOverflow(page);
      });
    });
  }
});
