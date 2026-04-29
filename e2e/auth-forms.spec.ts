import { test, expect } from '@playwright/test';

import { fillLoginForm } from './helpers';

/**
 * E2E tests for the auth login forms.
 *
 * These tests verify UI structure and error states only — no real credentials
 * are used and no session is established. The dev server must be running.
 *
 * Both pages use controlled React inputs with NO `name` attribute, so inputs
 * are targeted by `type` attribute via the `fillLoginForm` helper.
 */
test.describe('Auth forms', () => {
  test.describe('/admin/login', () => {
    test('page renders with email and password inputs visible', async ({ page }) => {
      await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('submit button "Iniciar sesión" is visible and enabled initially', async ({ page }) => {
      await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

      const btn = page.getByRole('button', { name: 'Iniciar sesión' });
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    });

    test('password input has type="password" (content not visible)', async ({ page }) => {
      await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();
      // Confirm the attribute is exactly "password" — browser masks the value.
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('submitting invalid credentials shows "Credenciales incorrectas"', async ({ page }) => {
      await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

      await fillLoginForm(page, 'test@invalid.com', 'wrongpassword12');
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();

      // Wait for the async fetch to complete and the error state to render.
      await expect(page.getByText('Credenciales incorrectas')).toBeVisible({
        timeout: 10_000,
      });
    });

    test('button shows loading state "Entrando..." while request is in flight', async ({ page }) => {
      await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

      await fillLoginForm(page, 'test@invalid.com', 'wrongpassword12');

      // Intercept the auth request so we can hold it open long enough to
      // observe the loading state before the response arrives.
      await page.route('**/api/auth/sign-in/email', async (route) => {
        // Delay the response by 2 s — enough to assert the loading text.
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        await route.continue();
      });

      // Click and immediately assert the loading label — the intercepted
      // request is still in flight at this point.
      const clickPromise = page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await expect(page.getByRole('button', { name: 'Entrando...' })).toBeVisible({
        timeout: 3_000,
      });

      // Let the request finish so the page settles before the test ends.
      await clickPromise;
      await expect(page.getByText('Credenciales incorrectas')).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe('/marcas/login', () => {
    test('page renders with email and password inputs visible', async ({ page }) => {
      await page.goto('/marcas/login', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('submit button "Acceder" is visible and enabled initially', async ({ page }) => {
      await page.goto('/marcas/login', { waitUntil: 'domcontentloaded' });

      const btn = page.getByRole('button', { name: 'Acceder' });
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    });

    test('submitting invalid credentials shows "Credenciales incorrectas"', async ({ page }) => {
      await page.goto('/marcas/login', { waitUntil: 'domcontentloaded' });

      await fillLoginForm(page, 'test@invalid.com', 'wrongpassword12');
      await page.getByRole('button', { name: 'Acceder' }).click();

      await expect(page.getByText('Credenciales incorrectas')).toBeVisible({
        timeout: 10_000,
      });
    });

    test('button shows loading state "Accediendo..." while request is in flight', async ({ page }) => {
      await page.goto('/marcas/login', { waitUntil: 'domcontentloaded' });

      await fillLoginForm(page, 'test@invalid.com', 'wrongpassword12');

      await page.route('**/api/auth/sign-in/email', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        await route.continue();
      });

      const clickPromise = page.getByRole('button', { name: 'Acceder' }).click();
      await expect(page.getByRole('button', { name: 'Accediendo...' })).toBeVisible({
        timeout: 3_000,
      });

      await clickPromise;
      await expect(page.getByText('Credenciales incorrectas')).toBeVisible({
        timeout: 10_000,
      });
    });
  });
});
