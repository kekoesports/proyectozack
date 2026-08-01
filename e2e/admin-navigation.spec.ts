/**
 * Admin sidebar navigation — verifies that nav links are present and route
 * correctly on desktop (1280×800) and mobile (375×667) viewports.
 *
 * Sidebar component: src/features/admin/_shared/components/AdminSidebar.tsx
 * Layout:           src/app/admin/(dashboard)/layout.tsx
 *
 * Nav items (admin role, from ADMIN_PRIMARY_NAV — labels as of 2026-07):
 *   Panel / Marcas / Talentos / Tratos → /admin/campanas
 *   Tareas / Facturación / Finanzas → /admin/finanzas/resumen / Equipo
 * Legacy e2e used "Campañas" and "P&L" — those labels no longer exist in nav.
 */
import { test, expect } from '@playwright/test';

import { gotoAdmin } from './helpers';

// ── Desktop ───────────────────────────────────────────────────────────────────

test.describe('Admin navigation', () => {
  test.describe('Desktop', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('sidebar is visible on desktop', async ({ page }) => {
      await gotoAdmin(page);
      const nav = page.getByRole('navigation');
      await expect(nav).toBeVisible();
    });

    test('clicking "Tratos" navigates to /admin/campanas', async ({ page }) => {
      await gotoAdmin(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Tratos', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/admin\/campanas/);
    });

    test('clicking "Talentos" navigates to /admin/talents', async ({ page }) => {
      await gotoAdmin(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Talentos', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/admin\/talents/);
    });

    test('clicking "Facturación" navigates to /admin/facturacion', async ({ page }) => {
      await gotoAdmin(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Facturación', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/admin\/facturacion/);
    });

    test('clicking "Finanzas" navigates to /admin/finanzas/resumen', async ({ page }) => {
      await gotoAdmin(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Finanzas', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/admin\/finanzas\/resumen/);
    });

    test('clicking "Marcas" navigates to /admin/brands', async ({ page }) => {
      await gotoAdmin(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Marcas', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/admin\/brands/);
    });

    test('clicking "Tareas" navigates to /admin/tareas', async ({ page }) => {
      await gotoAdmin(page);
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Tareas', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/admin\/tareas/);
    });
  });

  // ── Mobile ──────────────────────────────────────────────────────────────────

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('hamburger button is visible on mobile', async ({ page }) => {
      await gotoAdmin(page);
      const hamburger = page.getByRole('button', { name: 'Abrir menu' });
      await expect(hamburger).toBeVisible();
    });

    test('clicking hamburger opens the navigation', async ({ page }) => {
      await gotoAdmin(page);
      const hamburger = page.getByRole('button', { name: 'Abrir menu' });
      await hamburger.click();
      const nav = page.getByRole('navigation');
      await expect(nav).toBeVisible();
    });

    test('nav links are visible after opening the menu', async ({ page }) => {
      await gotoAdmin(page);
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      const nav = page.getByRole('navigation');
      await expect(nav.getByRole('link', { name: 'Tratos', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Marcas', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Talentos', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Tareas', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Facturación', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Finanzas', exact: true })).toBeVisible();
    });

    test('clicking a nav link after opening menu navigates correctly', async ({ page }) => {
      await gotoAdmin(page);
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Tratos', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/admin\/campanas/);
    });
  });
});
