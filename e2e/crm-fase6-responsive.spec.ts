/**
 * Responsive audit — verifies key admin pages render without horizontal overflow
 * on iPhone SE (375×667) and iPad (768×1024) viewports.
 *
 * Checks:
 *  - No element wider than the viewport (scrollWidth <= clientWidth)
 *  - Critical headings and navigation are visible
 *  - Mobile hamburger menu opens and shows nav links
 */
import { test, expect, type Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

async function gotoAdmin(page: Page, path: string): Promise<void> {
  const response = await page.goto(path);
  expect(response?.ok()).toBeTruthy();
}

// ── iPhone SE viewport ────────────────────────────────────────────────────────

test.describe('Responsive — iPhone SE (375×667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('dashboard renders without horizontal overflow', async ({ page }) => {
    await gotoAdmin(page, '/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Panel general' })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('mobile hamburger opens sidebar nav', async ({ page }) => {
    await gotoAdmin(page, '/admin');
    const hamburger = page.getByRole('button', { name: 'Abrir menu' });
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Marcas', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Campañas', exact: true })).toBeVisible();
  });

  test('campaigns page renders without horizontal overflow', async ({ page }) => {
    await gotoAdmin(page, '/admin/campanas');
    await expect(page.getByRole('heading', { level: 1, name: 'Campañas' })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('tasks page renders without horizontal overflow', async ({ page }) => {
    await gotoAdmin(page, '/admin/tareas');
    await expect(page.getByRole('heading', { level: 1, name: 'Tareas' })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('invoices page renders without horizontal overflow', async ({ page }) => {
    await gotoAdmin(page, '/admin/facturacion');
    await expect(page.getByRole('heading', { level: 1, name: 'Facturación' })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('P&L page renders without horizontal overflow', async ({ page }) => {
    await gotoAdmin(page, '/admin/pl');
    await expect(page.getByRole('heading', { level: 1, name: 'P&L' })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});

// ── iPad viewport ─────────────────────────────────────────────────────────────

test.describe('Responsive — iPad (768×1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('dashboard renders without horizontal overflow', async ({ page }) => {
    await gotoAdmin(page, '/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Panel general' })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('sidebar is visible without hamburger on tablet', async ({ page }) => {
    await gotoAdmin(page, '/admin');
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Marcas', exact: true })).toBeVisible();
  });

  test('brands page renders without horizontal overflow', async ({ page }) => {
    await gotoAdmin(page, '/admin/brands');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('P&L page renders without horizontal overflow', async ({ page }) => {
    await gotoAdmin(page, '/admin/pl');
    await expect(page.getByRole('heading', { level: 1, name: 'P&L' })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});
