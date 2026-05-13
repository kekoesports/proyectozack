import { test, expect } from '@playwright/test';

import { gotoAdmin } from './helpers';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns the first non-empty option value from a <select> element matched by
 * `selector`, or null if the select has no real options.
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

test.describe('Admin tasks CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, 'tareas');
    await expect(page).toHaveURL(/\/admin\/tareas$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Tareas' })).toBeVisible();
  });

  // ── Modal opens ──────────────────────────────────────────────────────────────

  test('modal opens: clicking Añadir shows Nueva tarea dialog', async ({ page }) => {
    await page.getByRole('button', { name: /añadir/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva tarea' });
    await expect(dialog).toBeVisible();

    // Core fields are present
    await expect(dialog.getByRole('button', { name: 'Crear tarea' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  });

  test('modal closes: clicking Cancelar dismisses the dialog', async ({ page }) => {
    await page.getByRole('button', { name: /añadir/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva tarea' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('modal closes: pressing Escape dismisses the dialog', async ({ page }) => {
    await page.getByRole('button', { name: /añadir/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva tarea' });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  // ── Validation ───────────────────────────────────────────────────────────────

  test('validation: empty title blocks form submission (HTML required)', async ({ page }) => {
    await page.getByRole('button', { name: /añadir/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva tarea' });
    await expect(dialog).toBeVisible();

    // Ensure title is empty
    const titleInput = dialog.locator('input').first();
    await titleInput.fill('');

    // Click submit — browser native `required` validation blocks the form
    await dialog.getByRole('button', { name: 'Crear tarea' }).click();

    // Dialog must remain open (form was not submitted)
    await expect(dialog).toBeVisible();

    // The title input must be invalid per browser native validation
    const isInvalid = await titleInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test('validation: title filled but empty category shows JS error message', async ({ page }) => {
    await page.getByRole('button', { name: /añadir/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva tarea' });
    await expect(dialog).toBeVisible();

    // Fill title so browser native validation passes for the title field
    const titleInput = dialog.locator('input').first();
    await titleInput.fill(`E2E Validation ${Date.now()}`);

    // The category select has `required` on the HTML element AND the JS guard checks
    // `category.trim()`. We need to:
    //   1. Remove the `required` attribute so browser native validation doesn't intercept
    //   2. Set value to '' so the JS guard fires and shows the error message
    await page.evaluate(() => {
      const selects = document.querySelectorAll<HTMLSelectElement>('[role="dialog"] select');
      for (const sel of selects) {
        const hasPlaceholder = Array.from(sel.options).some(
          (o) => o.text === '— Seleccionar categoría —',
        );
        if (hasPlaceholder) {
          sel.removeAttribute('required');
          sel.value = '';
        }
      }
    });

    await dialog.getByRole('button', { name: 'Crear tarea' }).click();

    // JS error message must be visible
    await expect(dialog.getByText('La categoría es obligatoria')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  // ── Create ───────────────────────────────────────────────────────────────────

  test('create: fills required fields and saves task — skips if no categories in DB', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /añadir/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva tarea' });
    await expect(dialog).toBeVisible();

    // Check if the category select has real options (populated from DB)
    const _firstCategoryValue = await getFirstSelectOption(
      page,
      '[role="dialog"][aria-label="Nueva tarea"] select',
    );

    // The category select is the one with the placeholder; find it via evaluate
    const categoryOptions = await page.evaluate(() => {
      const selects = document.querySelectorAll<HTMLSelectElement>(
        '[role="dialog"] select',
      );
      for (const sel of selects) {
        const hasPlaceholder = Array.from(sel.options).some(
          (o) => o.text === '— Seleccionar categoría —',
        );
        if (hasPlaceholder) {
          const real = Array.from(sel.options).find((o) => o.value !== '');
          return real?.value ?? null;
        }
      }
      return null;
    });

    if (categoryOptions === null) {
      // No categories seeded in DB — skip gracefully
      await dialog.getByRole('button', { name: 'Cancelar' }).click();
      test.skip();
      return;
    }

    const taskTitle = `E2E Task ${Date.now()}`;

    // Fill title (autofocused first input inside the form)
    const titleInput = dialog.locator('input').first();
    await titleInput.fill(taskTitle);

    // Select category
    const catSelect = dialog.locator('select').filter({ hasText: '— Seleccionar categoría —' });
    await catSelect.selectOption(categoryOptions);

    // Submit and wait for the server action to complete (revalidatePath triggers a navigation)
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/admin/tareas') && r.status() === 200,
        { timeout: 15_000 },
      ),
      dialog.getByRole('button', { name: 'Crear tarea' }).click(),
    ]);

    expect(response.ok()).toBe(true);

    // Dialog should close after success
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Task should appear in the list
    await expect(page.getByRole('main').getByText(taskTitle)).toBeVisible({ timeout: 10_000 });
  });

  // ── Cleanup: delete created task ─────────────────────────────────────────────

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup: dismiss any open modal first
    const dialog = page.getByRole('dialog', { name: 'Nueva tarea' });
    const isOpen = await dialog.isVisible().catch(() => false);
    if (isOpen) {
      await page.keyboard.press('Escape');
    }
  });

  // ── View switcher ─────────────────────────────────────────────────────────────

  test('view switcher — Kanban: clicking Kanban shows kanban columns', async ({ page }) => {
    await page.getByRole('button', { name: 'Kanban' }).click();

    // Kanban renders a 3-column grid with status headings
    await expect(page.getByRole('heading', { name: 'Pendiente' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'En progreso' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Completada' })).toBeVisible();

    // The list table should no longer be visible
    await expect(page.locator('table')).not.toBeVisible();
  });

  test('view switcher — Calendario: clicking Calendario shows calendar layout', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Calendario' }).click();

    // Calendar renders weekday headers (Monday-first) — use exact match to avoid
    // colliding with nav links like "Marcas"
    await expect(page.getByText('Lun', { exact: true })).toBeVisible();
    await expect(page.getByText('Mar', { exact: true })).toBeVisible();
    await expect(page.getByText('Mié', { exact: true })).toBeVisible();

    // Calendar navigation buttons are present
    await expect(page.getByRole('button', { name: 'Hoy' })).toBeVisible();

    // The list table should no longer be visible
    await expect(page.locator('table')).not.toBeVisible();
  });

  test('view switcher — Lista: clicking Lista restores list layout', async ({ page }) => {
    // Switch to Kanban first, then back to Lista
    await page.getByRole('button', { name: 'Kanban' }).click();
    await expect(page.getByRole('heading', { name: 'Pendiente' })).toBeVisible();

    await page.getByRole('button', { name: 'Lista' }).click();

    // List view renders a table
    await expect(page.locator('table')).toBeVisible();

    // Kanban columns should be gone
    await expect(page.getByRole('heading', { name: 'Pendiente' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'En progreso' })).not.toBeVisible();
  });

  test('view switcher — all three views cycle correctly', async ({ page }) => {
    // Start in Lista (default)
    await expect(page.locator('table')).toBeVisible();

    // → Kanban
    await page.getByRole('button', { name: 'Kanban' }).click();
    await expect(page.getByRole('heading', { name: 'Pendiente' })).toBeVisible();
    await expect(page.locator('table')).not.toBeVisible();

    // → Calendario
    await page.getByRole('button', { name: 'Calendario' }).click();
    await expect(page.getByText('Lun', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pendiente' })).not.toBeVisible();

    // → Lista
    await page.getByRole('button', { name: 'Lista' }).click();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByText('Lun', { exact: true })).not.toBeVisible();
  });
});
