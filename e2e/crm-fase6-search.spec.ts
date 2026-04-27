import { test, expect } from '@playwright/test';

test.describe('Admin global search smoke', () => {
  test('header shows search input with cmd-K hint and groups in popover', async ({ page }) => {
    const response = await page.goto('/admin');
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/admin$/);

    // GlobalSearch uses role="combobox" + aria-haspopup="listbox" (W3C combobox pattern).
    const search = page.getByRole('combobox', { name: 'Buscar' });
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute('placeholder', /⌘K/);
    await expect(search).toHaveAttribute('aria-haspopup', 'listbox');

    await search.fill('a');
    await expect(page.getByText(/al menos 2 caracteres/)).toBeVisible();

    await search.fill('za');
    await expect(page.locator('#global-search-results')).toBeVisible();
  });

  test('search API returns shaped JSON for short query', async ({ request }) => {
    const response = await request.get('/api/admin/search?q=a');
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { groups: Record<string, unknown[]> };
    expect(body.groups).toMatchObject({
      brands: [],
      campaigns: [],
      talents: [],
      invoices: [],
      tasks: [],
      contacts: [],
    });
  });

  test('search API responds for queries >= 2 characters and reports tookMs', async ({ request }) => {
    const response = await request.get('/api/admin/search?q=xy');
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { tookMs: number; query: string };
    expect(typeof body.tookMs).toBe('number');
    expect(body.query).toBe('xy');
  });
});
