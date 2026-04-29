/**
 * Brand portal sidebar navigation — verifies that nav links are present and
 * route correctly on desktop (1280×800) and mobile (375×667) viewports.
 *
 * Sidebar component: src/components/layout/PortalSidebar.tsx (variant="light")
 * Layout:           src/app/marcas/(portal)/layout.tsx
 *
 * Nav items (brand role, from BrandPortalLayout navItems):
 *   Dashboard   → /marcas
 *   Targets     → /marcas/targets
 *   Talentos    → /marcas/talentos
 *   Propuestas  → /marcas/propuestas
 *   Facturas    → /marcas/facturas
 *
 * Note: on desktop the sidebar collapses to an icon-only strip (w-14). Link
 * labels are hidden via `md:hidden` but the <Link> element carries
 * `aria-label={label}`, so `getByRole('link', { name })` resolves correctly
 * on both viewports.
 */
import { test, expect } from '@playwright/test';

import { gotoBrand } from './helpers';

// ── Desktop ───────────────────────────────────────────────────────────────────

test.describe('Brand portal navigation', () => {
  test.describe('Desktop', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('sidebar nav is visible on desktop', async ({ page }) => {
      await gotoBrand(page);
      const nav = page.getByRole('navigation');
      await expect(nav).toBeVisible();
    });

    test('clicking "Talentos" navigates to /marcas/talentos', async ({ page }) => {
      await gotoBrand(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Talentos', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/marcas\/talentos/);
    });

    test('clicking "Propuestas" navigates to /marcas/propuestas', async ({ page }) => {
      await gotoBrand(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Propuestas', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/marcas\/propuestas/);
    });

    test('clicking "Facturas" navigates to /marcas/facturas', async ({ page }) => {
      await gotoBrand(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Facturas', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/marcas\/facturas/);
    });

    test('clicking "Targets" navigates to /marcas/targets', async ({ page }) => {
      await gotoBrand(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Targets', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/marcas\/targets/);
    });

    test('clicking "Dashboard" navigates to /marcas', async ({ page }) => {
      await gotoBrand(page, 'talentos');
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Dashboard', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/marcas$/);
    });
  });

  // ── Mobile ──────────────────────────────────────────────────────────────────

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('hamburger button is visible on mobile', async ({ page }) => {
      await gotoBrand(page);
      const hamburger = page.getByRole('button', { name: 'Abrir menu' });
      await expect(hamburger).toBeVisible();
    });

    test('clicking hamburger opens the navigation', async ({ page }) => {
      await gotoBrand(page);
      const hamburger = page.getByRole('button', { name: 'Abrir menu' });
      await hamburger.click();
      const nav = page.getByRole('navigation');
      await expect(nav).toBeVisible();
    });

    test('nav links are visible after opening the menu', async ({ page }) => {
      await gotoBrand(page);
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      const nav = page.getByRole('navigation');
      await expect(nav.getByRole('link', { name: 'Talentos', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Propuestas', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Facturas', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Targets', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
    });

    test('clicking a nav link after opening menu navigates correctly', async ({ page }) => {
      await gotoBrand(page);
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Talentos', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/marcas\/talentos/);
    });
  });
});
