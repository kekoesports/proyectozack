import { test, expect } from '@playwright/test';

import type { Page } from '@playwright/test';

async function gotoCampaigns(page: Page): Promise<void> {
  const response = await page.goto('/admin/campanas');
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/admin\/campanas$/);
}

test.describe('Admin campaigns smoke', () => {
  test('campaigns index renders heading, CTA, filters, and either table or empty state', async ({
    page,
  }) => {
    await gotoCampaigns(page);

    const main = page.getByRole('main');

    await expect(main.getByRole('heading', { level: 1, name: 'Campañas' })).toBeVisible();
    await expect(main.getByRole('button', { name: /nueva campaña/i })).toBeVisible();

    await expect(main.locator('#campaign-search').first()).toBeVisible();
    await expect(main.locator('#campaign-status').first()).toBeVisible();
    await expect(main.locator('#campaign-brand').first()).toBeVisible();
    await expect(main.locator('#campaign-talent').first()).toBeVisible();
    await expect(main.locator('#campaign-responsible').first()).toBeVisible();
    await expect(main.locator('#campaign-sector').first()).toBeVisible();
    await expect(main.locator('#campaign-geo').first()).toBeVisible();

    const table = main.locator('table');
    if (await table.count()) {
      const firstTable = table.first();
      await expect(firstTable.getByRole('columnheader', { name: 'Nombre' })).toBeVisible();
      await expect(firstTable.getByRole('columnheader', { name: 'Marca' })).toBeVisible();
      await expect(firstTable.getByRole('columnheader', { name: 'Influencer' })).toBeVisible();
      await expect(firstTable.getByRole('columnheader', { name: 'Estado' })).toBeVisible();
      await expect(firstTable.getByRole('columnheader', { name: 'Comisión' })).toBeVisible();
      await expect(firstTable.getByRole('columnheader', { name: 'Responsable' })).toBeVisible();
    } else {
      await expect(main.getByText(/no hay campañas/i).first()).toBeVisible();
      await expect(main.getByText(/crea tu primera campaña/i).first()).toBeVisible();
    }
  });

  test('new campaign drawer is eur-only and does not expose a currency selector', async ({ page }) => {
    await gotoCampaigns(page);

    await page.getByRole('button', { name: /nueva campaña/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva campaña' });
    await expect(dialog).toBeVisible();

    await expect(dialog.locator('input[name="name"]')).toBeVisible();
    await expect(dialog.locator('select[name="brandId"]')).toBeVisible();
    await expect(dialog.locator('select[name="talentId"]')).toBeVisible();
    await expect(dialog.locator('select[name="actionType"]')).toBeVisible();
    await expect(dialog.locator('input[name="amountBrand"]')).toBeVisible();
    await expect(dialog.locator('input[name="amountTalent"]')).toBeVisible();
    await expect(dialog.getByText(/comisión calculada/i)).toBeVisible();

    await expect(dialog.locator('select[name="currency"]')).toHaveCount(0);
    await expect(dialog.getByText(/moneda|currency/i)).toHaveCount(0);
  });

  test('campaigns filters expose the archived toggle', async ({ page }) => {
    await gotoCampaigns(page);

    const main = page.getByRole('main');
    await expect(main.getByText('Archivadas').first()).toBeVisible();
    const toggle = main.getByRole('switch').first();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});
