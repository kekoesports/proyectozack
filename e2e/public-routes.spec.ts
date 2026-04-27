import { test, expect } from '@playwright/test';

/**
 * Smoke tests for the main public routes. Intentionally lean: each spec
 * verifies the page responds OK, the metadata title matches, and at least
 * one stable structural landmark is present. We deliberately avoid asserting
 * on copy, class names, or content counts so these tests survive design
 * tweaks and empty-state databases.
 */
test.describe('Public routes smoke', () => {
  test('home renders hero and contact anchor', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/SocialPro/);

    // Hero has the page's single <h1>; ContactSection renders #contacto.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#contacto')).toBeAttached();
  });

  test('/talentos renders the talent section', async ({ page }) => {
    const response = await page.goto('/talentos');
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/Streamers.*SocialPro/i);
    // `#talentos` is the section anchor used for in-page links from the nav.
    await expect(page.locator('#talentos')).toBeVisible();
  });

  test('/casos renders the cases section', async ({ page }) => {
    const response = await page.goto('/casos');
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/Campañas Gaming.*SocialPro/i);
    await expect(page.locator('#casos')).toBeVisible();
  });

  test('/blog renders the listing heading (or empty state)', async ({ page }) => {
    const response = await page.goto('/blog');
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/Marketing Gaming.*SocialPro/i);

    // The "Insights & Tendencias" heading is rendered regardless of whether
    // there are posts — the empty state ("Próximamente nuevos artículos.")
    // sits right below it. This keeps the test green against an empty DB.
    // Scope to level 2 to disambiguate from the sr-only <h1> SEO heading.
    await expect(
      page.getByRole('heading', { level: 2, name: /insights/i }),
    ).toBeVisible();
  });

  test('/contacto renders the form and validates an empty submit', async ({ page }) => {
    const response = await page.goto('/contacto');
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/Contacta.*SocialPro/i);

    const section = page.locator('#contacto');
    await expect(section).toBeVisible();

    // Form contract — field names are the API contract, safe to depend on.
    await expect(section.locator('input[name="name"]')).toBeVisible();
    await expect(section.locator('input[name="email"]')).toBeVisible();
    await expect(section.locator('select[name="type"]')).toBeVisible();
    await expect(section.locator('textarea[name="message"]')).toBeVisible();

    // Submitting an empty form must surface at least one client-side error
    // (Zod + react-hook-form). We do not submit a real payload to avoid
    // pulling Resend into the test path.
    await section.locator('button[type="submit"]').click();
    const errors = section.locator(
      '[role="alert"], .text-red-400, [aria-invalid="true"]',
    );
    await expect(errors.first()).toBeVisible({ timeout: 3000 });
  });
});
