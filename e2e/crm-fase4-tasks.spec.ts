import { test, expect } from '@playwright/test';

import type { Page } from '@playwright/test';

async function gotoTasks(page: Page): Promise<void> {
  const response = await page.goto('/admin/tareas');
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/admin\/tareas$/);
}

async function gotoTemplates(page: Page): Promise<void> {
  const response = await page.goto('/admin/tareas/plantillas');
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/admin\/tareas\/plantillas$/);
}

test.describe('Admin tasks smoke', () => {
  test('tasks workspace renders heading, view switcher, and add button', async ({ page }) => {
    await gotoTasks(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Tareas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lista' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kanban' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calendario' })).toBeVisible();
    await expect(page.getByRole('button', { name: /añadir/i })).toBeVisible();
  });

  test('task modal exposes campaign and general related types', async ({ page }) => {
    await gotoTasks(page);

    await page.getByRole('button', { name: /añadir/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva tarea' });
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText('Marca')).toBeVisible();
    await expect(dialog.getByText('Talent')).toBeVisible();
    await expect(dialog.getByText('Campaña')).toBeVisible();
    await expect(dialog.getByText('Factura')).toBeVisible();
    await expect(dialog.getByText('General')).toBeVisible();
  });

  test('task templates page renders recurring templates table and drawer', async ({ page }) => {
    await gotoTemplates(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Plantillas' })).toBeVisible();
    await expect(page.getByRole('button', { name: /nueva plantilla/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Frecuencia' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Prioridad' })).toBeVisible();

    await page.getByRole('button', { name: /nueva plantilla/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva plantilla' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[name="title"]')).toBeVisible();
    await expect(dialog.locator('input[name="category"]')).toBeVisible();
    await expect(dialog.locator('select[name="recurrence"]')).toBeVisible();
    await expect(dialog.locator('select[name="defaultPriority"]')).toBeVisible();
    await expect(dialog.locator('select[name="defaultAssigneeUserId"]')).toBeVisible();
  });
});
