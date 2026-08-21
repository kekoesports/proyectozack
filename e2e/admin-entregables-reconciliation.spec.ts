import { test, expect } from '@playwright/test';

import { gotoAdmin } from './helpers';

test.describe('Tracker reconciliation', () => {
  test('/admin/entregables/reconciliar renders', async ({ page }) => {
    await gotoAdmin(page, 'entregables/reconciliar');
    await expect(page.getByRole('heading', { level: 1, name: /reconciliar trackers/i })).toBeVisible();
    await expect(page.getByText(/nunca se aplica un candidato automático/i)).toBeVisible();
  });

  test('Enlazar stays disabled until a campaign is chosen', async ({ page }) => {
    await gotoAdmin(page, 'entregables/reconciliar');
    const linkButtons = page.getByRole('button', { name: 'Enlazar' });
    const count = await linkButtons.count();
    if (count === 0) {
      await expect(page.getByText(/no hay trackers en esta cola/i)).toBeVisible();
      return;
    }
    await expect(linkButtons.first()).toBeDisabled();
  });

  test('entregables list links to reconciliation', async ({ page }) => {
    await gotoAdmin(page, 'entregables');
    await expect(page.getByRole('link', { name: 'Reconciliar' })).toBeVisible();
    await page.getByRole('link', { name: 'Reconciliar' }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/admin\/entregables\/reconciliar/);
  });
});
