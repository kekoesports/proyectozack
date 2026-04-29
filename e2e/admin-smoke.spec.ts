import { test, expect } from '@playwright/test';

import { gotoAdmin } from './helpers';

test.describe('Admin smoke tests', () => {
  test('/admin renders', async ({ page }) => {
    await gotoAdmin(page);
    await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible();
  });

  test('/admin/brands renders', async ({ page }) => {
    await gotoAdmin(page, 'brands');
    await expect(page.getByRole('heading', { level: 1, name: /marcas/i })).toBeVisible();
  });

  test('/admin/talents renders', async ({ page }) => {
    await gotoAdmin(page, 'talents');
    await expect(page.getByRole('heading', { level: 1, name: /roster/i })).toBeVisible();
  });

  test('/admin/cases renders', async ({ page }) => {
    await gotoAdmin(page, 'cases');
    await expect(page.getByRole('heading', { level: 1, name: /casos de éxito/i })).toBeVisible();
  });

  test('/admin/equipo renders', async ({ page }) => {
    await gotoAdmin(page, 'equipo');
    await expect(page.getByRole('heading', { level: 1, name: /equipo/i })).toBeVisible();
  });

  test('/admin/equipo/fotos renders', async ({ page }) => {
    await gotoAdmin(page, 'equipo/fotos');
    await expect(page.getByRole('heading', { level: 1, name: /fotos del equipo/i })).toBeVisible();
  });

  test('/admin/giveaways renders', async ({ page }) => {
    await gotoAdmin(page, 'giveaways');
    await expect(page.getByRole('heading', { level: 1, name: /giveaways/i })).toBeVisible();
  });

  test('/admin/mi-semana renders', async ({ page }) => {
    await gotoAdmin(page, 'mi-semana');
    await expect(page.getByRole('heading', { level: 1, name: /mi semana/i })).toBeVisible();
  });

  test('/admin/stats renders', async ({ page }) => {
    await gotoAdmin(page, 'stats');
    await expect(page.getByRole('heading', { level: 1, name: /ranking/i })).toBeVisible();
  });

  test('/admin/targets renders', async ({ page }) => {
    await gotoAdmin(page, 'targets');
    await expect(page.getByRole('heading', { level: 1, name: /outreach/i })).toBeVisible();
  });

  test('/admin/facturacion/exports renders', async ({ page }) => {
    await gotoAdmin(page, 'facturacion/exports');
    await expect(page.getByRole('heading', { level: 1, name: /exports fiscales/i })).toBeVisible();
  });

  test('/admin/facturacion/import renders', async ({ page }) => {
    await gotoAdmin(page, 'facturacion/import');
    await expect(page.getByRole('heading', { level: 1, name: /importar facturas/i })).toBeVisible();
  });

  test('/admin/talents/fotos renders', async ({ page }) => {
    await gotoAdmin(page, 'talents/fotos');
    await expect(page.getByRole('heading', { level: 1, name: /fotos de talents/i })).toBeVisible();
  });
});
