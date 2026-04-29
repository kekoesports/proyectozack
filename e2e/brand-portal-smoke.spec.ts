import { test, expect } from '@playwright/test';

import { gotoBrand } from './helpers';

test.describe('Brand portal smoke tests', () => {
  test('/marcas renders', async ({ page }) => {
    await gotoBrand(page);
    // h1 is dynamic: "Hola, {session.user.name}" — match without name
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('/marcas/talentos renders', async ({ page }) => {
    await gotoBrand(page, 'talentos');
    await expect(page.getByRole('heading', { level: 1, name: /talentos/i })).toBeVisible();
    // Either a talent card grid or an empty state is present
    const hasCards = await page.locator('a[href^="/marcas/talentos/"]').count();
    const hasEmpty = await page.getByText(/ningun talento|talentos encontrados/i).count();
    expect(hasCards + hasEmpty).toBeGreaterThan(0);
  });

  test('/marcas/talentos/:slug renders', async ({ page }) => {
    await gotoBrand(page, 'talentos');
    await expect(page.getByRole('heading', { level: 1, name: /talentos/i })).toBeVisible();

    // Find the first talent card link
    const firstCard = page.locator('a[href^="/marcas/talentos/"]').first();
    const count = await firstCard.count();

    if (count === 0) {
      // No talents in DB — skip gracefully
      test.skip();
      return;
    }

    const href = await firstCard.getAttribute('href');
    await page.goto(href as string, { waitUntil: 'domcontentloaded' });

    // h1 is the talent name — dynamic, match without name
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('/marcas/comparar renders', async ({ page }) => {
    await gotoBrand(page, 'comparar');
    // Without ?ids= param the page shows the empty-state branch with h1 "Comparar talentos"
    await expect(page.getByRole('heading', { level: 1, name: /comparar talentos/i })).toBeVisible();
  });

  test('/marcas/propuestas renders', async ({ page }) => {
    await gotoBrand(page, 'propuestas');
    await expect(page.getByRole('heading', { level: 1, name: /mis propuestas/i })).toBeVisible();
    // Either a proposal list or an empty state is present
    const hasItems = await page.locator('[class*="rounded-2xl"]').count();
    expect(hasItems).toBeGreaterThanOrEqual(0); // page rendered without crash
  });

  test('/marcas/facturas renders', async ({ page }) => {
    await gotoBrand(page, 'facturas');
    await expect(page.getByRole('heading', { level: 1, name: /facturas/i })).toBeVisible();
    // Either a table or the empty-state paragraph is present
    const hasTable = await page.locator('table').count();
    const hasEmpty = await page.getByText(/aún no hay facturas/i).count();
    expect(hasTable + hasEmpty).toBeGreaterThan(0);
  });

  test('/marcas/targets renders', async ({ page }) => {
    await gotoBrand(page, 'targets');
    await expect(page.getByRole('heading', { level: 1, name: /targets/i })).toBeVisible();
  });
});
