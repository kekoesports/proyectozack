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

  test('has "¿Olvidaste tu contraseña?" link pointing to /admin/forgot-password', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

    const link = page.getByRole('link', { name: '¿Olvidaste tu contraseña?' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/admin/forgot-password');
  });

  // Note: /marcas/login was removed in PR #7 (brand portal cleanup);
  // brand authentication now goes through /admin/login.

  test.describe('/admin/forgot-password', () => {
    test('page renders with email input and submit button', async ({ page }) => {
      await page.goto('/admin/forgot-password', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Enviar enlace' })).toBeVisible();
    });

    test('"Volver al login" link points to /admin/login', async ({ page }) => {
      await page.goto('/admin/forgot-password', { waitUntil: 'domcontentloaded' });

      const link = page.getByRole('link', { name: 'Volver al login' });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/admin/login');
    });

    test('shows success message after submission (mocked API)', async ({ page }) => {
      await page.route('**/api/auth/forget-password', (route) =>
        route.fulfill({ status: 200, body: '{}' }),
      );

      await page.goto('/admin/forgot-password', { waitUntil: 'domcontentloaded' });
      await page.locator('input[type="email"]').fill('staff@example.com');
      await page.getByRole('button', { name: 'Enviar enlace' }).click();

      await expect(page.getByText(/Si el email está registrado/)).toBeVisible({ timeout: 5_000 });
    });

    test('shows loading state "Enviando..." while request is in flight', async ({ page }) => {
      await page.route('**/api/auth/forget-password', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        await route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/admin/forgot-password', { waitUntil: 'domcontentloaded' });
      await page.locator('input[type="email"]').fill('staff@example.com');

      const clickPromise = page.getByRole('button', { name: 'Enviar enlace' }).click();
      await expect(page.getByRole('button', { name: 'Enviando...' })).toBeVisible({ timeout: 3_000 });
      await clickPromise;
    });
  });

  test.describe('/admin/reset-password', () => {
    test('without token shows "Enlace inválido o expirado"', async ({ page }) => {
      await page.goto('/admin/reset-password', { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('Enlace inválido o expirado.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Guardar contraseña' })).toBeDisabled();
    });

    test('with token shows two password inputs and enabled submit', async ({ page }) => {
      await page.goto('/admin/reset-password?token=abc123', { waitUntil: 'domcontentloaded' });

      const inputs = page.locator('input[type="password"]');
      await expect(inputs).toHaveCount(2);
      await expect(page.getByRole('button', { name: 'Guardar contraseña' })).toBeEnabled();
    });

    test('"Volver al login" link points to /admin/login', async ({ page }) => {
      await page.goto('/admin/reset-password?token=abc123', { waitUntil: 'domcontentloaded' });

      const link = page.getByRole('link', { name: 'Volver al login' });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/admin/login');
    });

    test('mismatched passwords shows validation error', async ({ page }) => {
      await page.goto('/admin/reset-password?token=abc123', { waitUntil: 'domcontentloaded' });

      // Wait for both password inputs to be present (token-gated form)
      const inputs = page.locator('input[type="password"]');
      await expect(inputs).toHaveCount(2);

      await inputs.first().pressSequentially('password-one-1234');
      await inputs.last().pressSequentially('password-two-5678');
      await page.getByRole('button', { name: 'Guardar contraseña' }).click();

      await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
    });

    test('password shorter than 12 chars shows validation error', async ({ page }) => {
      await page.goto('/admin/reset-password?token=abc123', { waitUntil: 'domcontentloaded' });

      const inputs = page.locator('input[type="password"]');
      // Remove HTML minlength so the form submits and the JS guard runs.
      await inputs.nth(0).evaluate((el: HTMLInputElement) => el.removeAttribute('minlength'));
      await inputs.nth(0).fill('tooshort');
      await inputs.nth(1).fill('tooshort');
      await page.getByRole('button', { name: 'Guardar contraseña' }).click();

      await expect(page.getByText(/al menos 12 caracteres/)).toBeVisible();
    });

    test('successful reset shows confirmation and loading state (mocked API)', async ({ page }) => {
      await page.route('**/api/auth/reset-password', (route) =>
        route.fulfill({ status: 200, body: '{}' }),
      );

      await page.goto('/admin/reset-password?token=validtoken', { waitUntil: 'domcontentloaded' });

      const inputs = page.locator('input[type="password"]');
      await inputs.nth(0).fill('new-secure-password-1');
      await inputs.nth(1).fill('new-secure-password-1');
      await page.getByRole('button', { name: 'Guardar contraseña' }).click();

      await expect(page.getByText('Contraseña actualizada.')).toBeVisible({ timeout: 5_000 });
    });

    test('expired/invalid token from API shows error message', async ({ page }) => {
      await page.route('**/api/auth/reset-password', (route) =>
        route.fulfill({ status: 400, body: '{"error":"Invalid token"}' }),
      );

      await page.goto('/admin/reset-password?token=expiredtoken', { waitUntil: 'domcontentloaded' });

      const inputs = page.locator('input[type="password"]');
      await inputs.nth(0).fill('new-secure-password-1');
      await inputs.nth(1).fill('new-secure-password-1');
      await page.getByRole('button', { name: 'Guardar contraseña' }).click();

      await expect(page.getByText(/expirado o no es válido/)).toBeVisible({ timeout: 5_000 });
    });
  });
});
