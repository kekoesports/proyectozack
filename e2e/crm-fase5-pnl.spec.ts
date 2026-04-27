import { test, expect } from '@playwright/test';

import type { Page } from '@playwright/test';

async function gotoInvoices(page: Page): Promise<void> {
  const response = await page.goto('/admin/facturacion');
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/admin\/facturacion$/);
}

async function gotoPnL(page: Page): Promise<void> {
  const response = await page.goto('/admin/pl');
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/admin\/pl/);
}

test.describe('Admin invoices + P&L smoke', () => {
  test('invoices page renders new toolbar and drawer with new fields', async ({ page }) => {
    await gotoInvoices(page);

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Facturación' })).toBeVisible();
    await expect(main.getByRole('button', { name: /nueva factura/i })).toBeVisible();
    await expect(main.getByLabel('Mostrar anuladas')).toBeVisible();
    await expect(main.getByRole('link', { name: 'P&L' })).toBeVisible();

    await main.getByRole('button', { name: /nueva factura/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva factura' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('select[name="company"]')).toBeVisible();
    await expect(dialog.locator('select[name="paymentMethod"]')).toBeVisible();
    await expect(dialog.locator('select[name="campaignId"]')).toBeVisible();
    await expect(dialog.locator('input[name="invoiceFile"]')).toBeVisible();
    await expect(dialog.locator('input[name="statementFile"]')).toBeVisible();
    await expect(dialog.getByText('Moneda fija: EUR')).toBeVisible();
  });

  test('P&L page renders cards, monthly breakdown, and CSV export button', async ({ page }) => {
    await gotoPnL(page);

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'P&L' })).toBeVisible();
    await expect(main.getByText('Ingresos', { exact: true }).first()).toBeVisible();
    await expect(main.getByText('Gastos', { exact: true }).first()).toBeVisible();
    await expect(main.getByText('Margen bruto').first()).toBeVisible();
    await expect(main.getByText('Pendiente cobro').first()).toBeVisible();
    await expect(main.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Aplicar' })).toBeVisible();
  });

  test('P&L CSV export endpoint returns text/csv with BOM', async ({ request }) => {
    const response = await request.get('/admin/pl/export?from=2026-01-01&to=2026-12-31');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('text/csv');
    const body = await response.body();
    // BOM marker for Excel ES compatibility
    expect(body[0]).toBe(0xef);
    expect(body[1]).toBe(0xbb);
    expect(body[2]).toBe(0xbf);
    const text = body.toString('utf8');
    expect(text).toContain('Sección;Etiqueta;Importe');
    expect(text).toContain('Ingresos');
  });
});
