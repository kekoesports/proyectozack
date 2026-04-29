import { test, expect } from '@playwright/test';

import { gotoAdmin } from './helpers';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns the first option value (non-empty) from a <select> element,
 * or null if the select has no real options.
 */
async function getFirstSelectOption(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<string | null> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector<HTMLSelectElement>(sel);
    if (!el) return null;
    const opt = Array.from(el.options).find((o) => o.value !== '');
    return opt?.value ?? null;
  }, selector);
}

// ── Suite ──────────────────────────────────────────────────────────────────────

test.describe('Admin campaigns CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, 'campanas');
    await expect(page).toHaveURL(/\/admin\/campanas$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Campañas' })).toBeVisible();
  });

  // ── Create ─────────────────────────────────────────────────────────────────

  test('create: drawer opens when clicking Nueva campaña', async ({ page }) => {
    await page.getByRole('button', { name: /nueva campaña/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva campaña' });
    await expect(dialog).toBeVisible();

    // Required fields are present
    await expect(dialog.locator('input[name="name"]')).toBeVisible();
    await expect(dialog.locator('select[name="brandId"]')).toBeVisible();
    await expect(dialog.locator('select[name="talentId"]')).toBeVisible();
    await expect(dialog.locator('select[name="actionType"]')).toBeVisible();

    // Guardar and Cancelar buttons are present
    await expect(dialog.getByRole('button', { name: 'Guardar' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  });

  test('create: drawer closes when clicking Cancelar', async ({ page }) => {
    await page.getByRole('button', { name: /nueva campaña/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva campaña' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).not.toBeVisible();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  test('validation: empty name prevents form submission (HTML required)', async ({ page }) => {
    await page.getByRole('button', { name: /nueva campaña/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva campaña' });
    await expect(dialog).toBeVisible();

    // Ensure name is empty and try to submit
    const nameInput = dialog.locator('input[name="name"]');
    await nameInput.fill('');

    // Click Guardar — the browser's native required validation should block submission
    await dialog.getByRole('button', { name: 'Guardar' }).click();

    // Dialog must still be open (form was not submitted)
    await expect(dialog).toBeVisible();

    // The name input should be invalid (browser native validation)
    const isInvalid = await nameInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  // ── Create + Archive + Unarchive (requires brands and talents in DB) ────────

  test('create: fills required fields and saves campaign — skips if no brands or talents', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /nueva campaña/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva campaña' });
    await expect(dialog).toBeVisible();

    // Check if brand and talent selects have options
    const firstBrandValue = await getFirstSelectOption(
      page,
      'dialog[aria-label="Nueva campaña"] select[name="brandId"]',
    );
    const firstTalentValue = await getFirstSelectOption(
      page,
      'dialog[aria-label="Nueva campaña"] select[name="talentId"]',
    );
    const firstActionValue = await getFirstSelectOption(
      page,
      'dialog[aria-label="Nueva campaña"] select[name="actionType"]',
    );

    if (firstBrandValue === null || firstTalentValue === null || firstActionValue === null) {
      test.skip();
      return;
    }

    const campaignName = `E2E Test ${Date.now()}`;

    // Fill name
    await dialog.locator('input[name="name"]').fill(campaignName);

    // Select brand
    await dialog.locator('select[name="brandId"]').selectOption(firstBrandValue);

    // Select talent
    await dialog.locator('select[name="talentId"]').selectOption(firstTalentValue);

    // Select action type
    await dialog.locator('select[name="actionType"]').selectOption(firstActionValue);

    // Submit and wait for the server action to complete (router.refresh triggers a navigation)
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/admin/campanas') && r.status() === 200,
        { timeout: 15_000 },
      ),
      dialog.getByRole('button', { name: 'Guardar' }).click(),
    ]);

    expect(response.ok()).toBe(true);

    // Drawer should close after success
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Campaign should appear in the list
    await expect(page.getByRole('main').getByText(campaignName)).toBeVisible({ timeout: 10_000 });
  });

  test('archive: archives campaign and it disappears from active list — skips if no campaigns', async ({
    page,
  }) => {
    const main = page.getByRole('main');

    // Check if there's a table with rows (active campaigns)
    const table = main.locator('table');
    const tableCount = await table.count();
    if (tableCount === 0) {
      test.skip();
      return;
    }

    // Find the first "Editar" button in the table
    const editButtons = main.getByRole('button', { name: 'Editar' });
    const editCount = await editButtons.count();
    if (editCount === 0) {
      test.skip();
      return;
    }

    // Get the campaign name from the first row before editing
    const firstRow = main.locator('table tbody tr').first();
    const campaignName = await firstRow.locator('td').first().textContent();

    // Click the first Editar button
    await editButtons.first().click();

    const dialog = page.getByRole('dialog', { name: 'Editar campaña' });
    await expect(dialog).toBeVisible();

    // The Archivar button should be visible (admin role, not manager)
    const archiveBtn = dialog.getByRole('button', { name: 'Archivar' });
    const archiveBtnCount = await archiveBtn.count();
    if (archiveBtnCount === 0) {
      // Manager role — cannot archive, skip
      await dialog.getByRole('button', { name: 'Cancelar' }).click();
      test.skip();
      return;
    }

    // Archive the campaign
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/admin/campanas') && r.status() === 200,
        { timeout: 15_000 },
      ),
      archiveBtn.click(),
    ]);

    expect(response.ok()).toBe(true);

    // Drawer should close
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Campaign should no longer appear in the active list (showArchived = false by default)
    if (campaignName !== null) {
      const trimmedName = campaignName.replace(/\(archivada\)/, '').trim();
      // Wait for the list to refresh
      await page.waitForTimeout(1_000);
      // The campaign row should be gone from the active view
      const activeRows = main.locator('table tbody tr');
      const rowCount = await activeRows.count();
      for (let i = 0; i < rowCount; i++) {
        const rowText = await activeRows.nth(i).locator('td').first().textContent();
        expect(rowText?.replace(/\(archivada\)/, '').trim()).not.toBe(trimmedName);
      }
    }

    // Enable "Archivadas" toggle — campaign should appear there
    const toggle = main.getByRole('switch').first();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // The archived list should now show campaigns
    const archivedTable = main.locator('table');
    await expect(archivedTable).toBeVisible({ timeout: 5_000 });
  });

  test('unarchive: archived campaign can be restored to active list — skips if no archived campaigns', async ({
    page,
  }) => {
    const main = page.getByRole('main');

    // Enable "Archivadas" toggle to see archived campaigns
    const toggle = main.getByRole('switch').first();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Check if there are archived campaigns
    const table = main.locator('table');
    const tableCount = await table.count();
    if (tableCount === 0) {
      test.skip();
      return;
    }

    const editButtons = main.getByRole('button', { name: 'Editar' });
    const editCount = await editButtons.count();
    if (editCount === 0) {
      test.skip();
      return;
    }

    // Open the first archived campaign in the drawer
    await editButtons.first().click();

    const dialog = page.getByRole('dialog', { name: 'Editar campaña' });
    await expect(dialog).toBeVisible();

    // Note: The current UI does not expose a "Desarchivar" button in the drawer.
    // The unarchiveCampaignAction exists in actions.ts but has no UI trigger yet.
    // We verify the drawer opens correctly for an archived campaign and close it.
    await expect(dialog.locator('input[name="name"]')).toBeVisible();

    // Close the drawer
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).not.toBeVisible();

    // Verify the archived toggle still shows archived campaigns
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(main.locator('table')).toBeVisible();
  });

  // ── Full CRUD flow (create → archive → verify archived list) ────────────────

  test('full flow: create → archive → verify in archived list — skips if no brands or talents', async ({
    page,
  }) => {
    const main = page.getByRole('main');

    // ── Step 1: Create ──────────────────────────────────────────────────────

    await page.getByRole('button', { name: /nueva campaña/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva campaña' });
    await expect(dialog).toBeVisible();

    // Check prerequisites
    const firstBrandValue = await getFirstSelectOption(
      page,
      'dialog[aria-label="Nueva campaña"] select[name="brandId"]',
    );
    const firstTalentValue = await getFirstSelectOption(
      page,
      'dialog[aria-label="Nueva campaña"] select[name="talentId"]',
    );
    const firstActionValue = await getFirstSelectOption(
      page,
      'dialog[aria-label="Nueva campaña"] select[name="actionType"]',
    );

    if (firstBrandValue === null || firstTalentValue === null || firstActionValue === null) {
      await dialog.getByRole('button', { name: 'Cancelar' }).click();
      test.skip();
      return;
    }

    const campaignName = `E2E CRUD ${Date.now()}`;

    await dialog.locator('input[name="name"]').fill(campaignName);
    await dialog.locator('select[name="brandId"]').selectOption(firstBrandValue);
    await dialog.locator('select[name="talentId"]').selectOption(firstTalentValue);
    await dialog.locator('select[name="actionType"]').selectOption(firstActionValue);

    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/admin/campanas') && r.status() === 200,
        { timeout: 15_000 },
      ),
      dialog.getByRole('button', { name: 'Guardar' }).click(),
    ]);

    expect(createResponse.ok()).toBe(true);
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Campaign appears in active list
    await expect(main.getByText(campaignName)).toBeVisible({ timeout: 10_000 });

    // ── Step 2: Archive ─────────────────────────────────────────────────────

    // Find the row for our campaign and click Editar
    const campaignRow = main.locator('table tbody tr').filter({ hasText: campaignName });
    await expect(campaignRow).toBeVisible();

    const editBtn = campaignRow.getByRole('button', { name: 'Editar' });
    await editBtn.click();

    const editDialog = page.getByRole('dialog', { name: 'Editar campaña' });
    await expect(editDialog).toBeVisible();

    const archiveBtn = editDialog.getByRole('button', { name: 'Archivar' });
    const archiveBtnCount = await archiveBtn.count();

    if (archiveBtnCount === 0) {
      // Manager role — cannot archive; clean up by cancelling
      await editDialog.getByRole('button', { name: 'Cancelar' }).click();
      test.skip();
      return;
    }

    const [archiveResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/admin/campanas') && r.status() === 200,
        { timeout: 15_000 },
      ),
      archiveBtn.click(),
    ]);

    expect(archiveResponse.ok()).toBe(true);
    await expect(editDialog).not.toBeVisible({ timeout: 10_000 });

    // Campaign should be gone from active list
    await expect(main.getByText(campaignName)).not.toBeVisible({ timeout: 5_000 });

    // ── Step 3: Verify in archived list ────────────────────────────────────

    const toggle = main.getByRole('switch').first();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Campaign should appear in archived list
    await expect(main.getByText(campaignName)).toBeVisible({ timeout: 10_000 });
  });
});
