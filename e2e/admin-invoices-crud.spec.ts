import { test, expect } from '@playwright/test';

import { gotoAdmin } from './helpers';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Navigate to /admin/facturacion and assert the page loaded.
 */
async function gotoInvoices(page: import('@playwright/test').Page): Promise<void> {
  await gotoAdmin(page, 'facturacion');
  await expect(page).toHaveURL(/\/admin\/facturacion$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Facturación' })).toBeVisible();
}

/**
 * Open the "Nueva factura" drawer and return the dialog locator.
 */
async function openNewInvoiceDrawer(
  page: import('@playwright/test').Page,
): Promise<import('@playwright/test').Locator> {
  await page.getByRole('main').getByRole('button', { name: /nueva factura/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Nueva factura' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Annul an invoice row identified by its concept text.
 * Handles the browser confirm() dialog automatically.
 */
async function annulInvoiceByConceptText(
  page: import('@playwright/test').Page,
  concept: string,
): Promise<void> {
  const main = page.getByRole('main');
  const row = main.locator('table tbody tr').filter({ hasText: concept });
  const count = await row.count();
  if (count === 0) return; // already gone or never created

  const annulBtn = row.getByRole('button', { name: 'Anular' });
  const annulCount = await annulBtn.count();
  if (annulCount === 0) return; // already anulada

  page.once('dialog', (d) => d.accept());
  await annulBtn.click();
  // Wait for the row to disappear from the default (non-anuladas) view
  await expect(row).not.toBeVisible({ timeout: 10_000 });
}

// ── Suite ──────────────────────────────────────────────────────────────────────

test.describe('Admin invoices CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await gotoInvoices(page);
  });

  // ── Drawer opens ─────────────────────────────────────────────────────────────

  test('drawer: opens with all expected form fields when clicking Nueva factura', async ({
    page,
  }) => {
    const dialog = await openNewInvoiceDrawer(page);

    // Required fields
    await expect(dialog.locator('select[name="kind"]')).toBeVisible();
    await expect(dialog.locator('input[name="issueDate"]')).toBeVisible();
    await expect(dialog.locator('input[name="concept"]')).toBeVisible();
    await expect(dialog.locator('input[name="netAmount"]')).toBeVisible();
    await expect(dialog.locator('input[name="totalAmount"]')).toBeVisible();

    // Optional but present fields
    await expect(dialog.locator('select[name="company"]')).toBeVisible();
    await expect(dialog.locator('select[name="paymentMethod"]')).toBeVisible();
    await expect(dialog.locator('select[name="campaignId"]')).toBeVisible();
    await expect(dialog.locator('input[name="invoiceFile"]')).toBeVisible();
    await expect(dialog.locator('input[name="statementFile"]')).toBeVisible();
    await expect(dialog.getByText('Moneda fija: EUR')).toBeVisible();

    // Action buttons
    await expect(dialog.getByRole('button', { name: 'Crear factura' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  });

  test('drawer: closes when clicking Cancelar', async ({ page }) => {
    const dialog = await openNewInvoiceDrawer(page);

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).not.toBeVisible();
  });

  // ── Validation ────────────────────────────────────────────────────────────────

  test('validation: empty concepto blocks submission via HTML required constraint', async ({
    page,
  }) => {
    const dialog = await openNewInvoiceDrawer(page);

    // Ensure concept is empty
    const conceptInput = dialog.locator('input[name="concept"]');
    await conceptInput.fill('');

    // Attempt to submit
    await dialog.getByRole('button', { name: 'Crear factura' }).click();

    // Dialog must remain open — form was not submitted
    await expect(dialog).toBeVisible();

    // Browser native validation marks the field as invalid
    const isInvalid = await conceptInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  // ── Create ────────────────────────────────────────────────────────────────────

  test('create: fills required fields and invoice appears in list', async ({ page }) => {
    const concept = `E2E Factura ${Date.now()}`;
    const dialog = await openNewInvoiceDrawer(page);

    // kind defaults to 'income' — leave as-is
    await expect(dialog.locator('select[name="kind"]')).toHaveValue('income');

    // Fill concept (required, min 1 char)
    await dialog.locator('input[name="concept"]').fill(concept);

    // Fill netAmount — totalAmount is auto-computed (read-only)
    const netInput = dialog.locator('input[name="netAmount"]');
    await netInput.fill('');
    await netInput.type('100');

    // Submit and wait for the page to revalidate
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/admin/facturacion') && r.status() === 200,
        { timeout: 20_000 },
      ),
      dialog.getByRole('button', { name: 'Crear factura' }).click(),
    ]);

    expect(response.ok()).toBe(true);

    // Drawer should close after success
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Invoice should appear in the list
    const main = page.getByRole('main');
    await expect(main.getByText(concept)).toBeVisible({ timeout: 10_000 });

    // ── Cleanup: annul the created invoice ──────────────────────────────────
    await annulInvoiceByConceptText(page, concept);
  });

  test('create: expense invoice appears with Gasto badge', async ({ page }) => {
    const concept = `E2E Gasto ${Date.now()}`;
    const dialog = await openNewInvoiceDrawer(page);

    // Switch kind to expense
    await dialog.locator('select[name="kind"]').selectOption('expense');

    await dialog.locator('input[name="concept"]').fill(concept);

    const netInput = dialog.locator('input[name="netAmount"]');
    await netInput.fill('');
    await netInput.type('50');

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/admin/facturacion') && r.status() === 200,
        { timeout: 20_000 },
      ),
      dialog.getByRole('button', { name: 'Crear factura' }).click(),
    ]);

    expect(response.ok()).toBe(true);
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    const main = page.getByRole('main');
    const row = main.locator('table tbody tr').filter({ hasText: concept });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // The row should show the "Gasto" kind badge (the <span> in the first <td>)
    const kindCell = row.locator('td').first();
    await expect(kindCell.getByText('Gasto', { exact: true })).toBeVisible();

    // ── Cleanup ─────────────────────────────────────────────────────────────
    await annulInvoiceByConceptText(page, concept);
  });

  // ── Toggle anuladas ───────────────────────────────────────────────────────────

  test('toggle anuladas: checkbox changes state when clicked', async ({ page }) => {
    const main = page.getByRole('main');
    const checkbox = main.getByLabel('Mostrar anuladas');

    // Initially unchecked
    await expect(checkbox).not.toBeChecked();

    // Click to enable
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Click again to disable
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  });

  test('toggle anuladas: annulling an invoice removes it from the default list', async ({ page }) => {
    const concept = `E2E Anulada ${Date.now()}`;
    const main = page.getByRole('main');

    // ── Create an invoice ───────────────────────────────────────────────────
    const dialog = await openNewInvoiceDrawer(page);
    await dialog.locator('input[name="concept"]').fill(concept);
    const netInput = dialog.locator('input[name="netAmount"]');
    await netInput.fill('');
    await netInput.type('10');

    const [createResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/admin/facturacion') && r.status() === 200,
        { timeout: 20_000 },
      ),
      dialog.getByRole('button', { name: 'Crear factura' }).click(),
    ]);
    expect(createResp.ok()).toBe(true);
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
    await expect(main.getByText(concept)).toBeVisible({ timeout: 10_000 });

    // ── Annul it ────────────────────────────────────────────────────────────
    const row = main.locator('table tbody tr').filter({ hasText: concept });
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Anular' }).click();

    // Row disappears from default view (anuladas hidden by default).
    // The server page fetches invoices without includeAnuladas, so after
    // revalidation the anulada invoice is excluded from the prop entirely.
    await expect(row).not.toBeVisible({ timeout: 15_000 });

    // ── Verify the invoice is gone from the default list ────────────────────
    // After the RSC revalidation, the page re-renders without the anulada invoice.
    // The concept text should no longer appear in the list.
    await expect(main.getByText(concept, { exact: false })).not.toBeVisible({ timeout: 5_000 });
  });

  // ── Search filter ─────────────────────────────────────────────────────────────

  test('search: typing in search box filters the list', async ({ page }) => {
    const main = page.getByRole('main');

    // Check if there are any invoices to search through
    const table = main.locator('table');
    const tableCount = await table.count();
    if (tableCount === 0) {
      // No invoices — just verify the search box is present and accepts input
      const searchBox = main.locator('input[type="search"]');
      await expect(searchBox).toBeVisible();
      await searchBox.fill('test query');
      await expect(searchBox).toHaveValue('test query');
      return;
    }

    const searchBox = main.locator('input[type="search"]');
    await expect(searchBox).toBeVisible();

    // Type a string that is very unlikely to match any invoice
    const noMatchQuery = `ZZZZ_NO_MATCH_${Date.now()}`;
    await searchBox.fill(noMatchQuery);

    // The table should disappear (no results) or show empty state
    await expect(table).not.toBeVisible({ timeout: 5_000 });

    // Clear search — table should reappear
    await searchBox.fill('');
    await expect(table).toBeVisible({ timeout: 5_000 });
  });

  test('search: search box is visible and accepts input', async ({ page }) => {
    const main = page.getByRole('main');
    const searchBox = main.locator('input[type="search"]');

    await expect(searchBox).toBeVisible();
    await expect(searchBox).toHaveAttribute(
      'placeholder',
      /buscar/i,
    );

    await searchBox.fill('campaña');
    await expect(searchBox).toHaveValue('campaña');

    // Clear
    await searchBox.fill('');
    await expect(searchBox).toHaveValue('');
  });

  // ── Kind filter ───────────────────────────────────────────────────────────────

  test('kind filter: select renders with expected options', async ({ page }) => {
    const main = page.getByRole('main');

    // The kind filter select is the first <select> in the toolbar (not inside a dialog)
    // It has options: "Todos los tipos", "Ingresos", "Gastos"
    const kindSelect = main.locator('select').first();
    await expect(kindSelect).toBeVisible();

    // Verify option values exist
    const allOption = kindSelect.locator('option[value="all"]');
    const incomeOption = kindSelect.locator('option[value="income"]');
    const expenseOption = kindSelect.locator('option[value="expense"]');

    await expect(allOption).toHaveCount(1);
    await expect(incomeOption).toHaveCount(1);
    await expect(expenseOption).toHaveCount(1);
  });

  test('kind filter: selecting Ingresos filters list to income invoices only', async ({
    page,
  }) => {
    const main = page.getByRole('main');
    const kindSelect = main.locator('select').first();

    // Select "Ingresos"
    await kindSelect.selectOption('income');
    await expect(kindSelect).toHaveValue('income');

    // If there is a table, all visible kind badges should be "Ingreso"
    // The kind badge lives in the first <td> of each row as a <span>
    const table = main.locator('table');
    const tableCount = await table.count();
    if (tableCount > 0) {
      // Kind badges are <span> elements inside the first <td> of each row
      const expenseBadges = table.locator('tbody tr td:first-child span').filter({ hasText: /^Gasto$/ });
      await expect(expenseBadges).toHaveCount(0);
    }

    // Reset to all
    await kindSelect.selectOption('all');
    await expect(kindSelect).toHaveValue('all');
  });

  test('kind filter: selecting Gastos filters list to expense invoices only', async ({
    page,
  }) => {
    const main = page.getByRole('main');
    const kindSelect = main.locator('select').first();

    // Select "Gastos"
    await kindSelect.selectOption('expense');
    await expect(kindSelect).toHaveValue('expense');

    // If there is a table, all visible kind badges should be "Gasto"
    // The kind badge lives in the first <td> of each row as a <span>
    const table = main.locator('table');
    const tableCount = await table.count();
    if (tableCount > 0) {
      const incomeBadges = table.locator('tbody tr td:first-child span').filter({ hasText: /^Ingreso$/ });
      await expect(incomeBadges).toHaveCount(0);
    }

    // Reset to all
    await kindSelect.selectOption('all');
    await expect(kindSelect).toHaveValue('all');
  });
});
