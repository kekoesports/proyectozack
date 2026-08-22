import { test, expect } from '@playwright/test';

import { gotoAdmin } from './helpers';

test.describe('Task sanitation', () => {
  test('/admin/tareas/saneamiento renders', async ({ page }) => {
    await gotoAdmin(page, 'tareas/saneamiento');
    await expect(page.getByRole('heading', { level: 1, name: /saneamiento de tareas/i })).toBeVisible();
    await expect(page.getByText(/no hay acción masiva/i)).toBeVisible();
  });

  test('tareas workspace links to sanitation', async ({ page }) => {
    await gotoAdmin(page, 'tareas');
    await expect(page.getByRole('link', { name: 'Saneamiento' })).toBeVisible();
    await page.getByRole('link', { name: 'Saneamiento' }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/admin\/tareas\/saneamiento/);
  });
});
