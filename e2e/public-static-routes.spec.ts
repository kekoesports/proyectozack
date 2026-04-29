import { test, expect } from '@playwright/test';

/**
 * Smoke tests for public static routes not covered by public-routes.spec.ts.
 * (That file covers: /, /talentos, /casos, /blog, /contacto.)
 *
 * Each page test verifies:
 *   1. HTTP 200 response
 *   2. Page title contains "SocialPro"
 *   3. At least one stable structural landmark is visible
 *
 * API-endpoint tests (/robots.txt, /sitemap.xml) use the `request` fixture
 * to avoid loading a full browser page for plain-text/XML responses.
 */
test.describe('Public static routes', () => {
  test('/nosotros', async ({ page }) => {
    const response = await page.goto('/nosotros');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/SocialPro/);

    // AboutSection renders <section id="nosotros"> — stable structural anchor.
    await expect(page.locator('#nosotros')).toBeVisible();
  });

  test('/metodologia', async ({ page }) => {
    const response = await page.goto('/metodologia');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/SocialPro/);

    // Visible <h1> rendered directly in MetodologiaPage.
    await expect(
      page.getByRole('heading', { level: 1, name: /proceso probado/i }),
    ).toBeVisible();
  });

  test('/servicios', async ({ page }) => {
    const response = await page.goto('/servicios');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/SocialPro/);

    // ServicesSection renders <section id="servicios"> — stable structural anchor.
    await expect(page.locator('#servicios')).toBeVisible();
  });

  test('/servicios/igaming', async ({ page }) => {
    const response = await page.goto('/servicios/igaming');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/SocialPro/);

    // Visible <h1> rendered directly in IgamingPage.
    await expect(
      page.getByRole('heading', { level: 1, name: /campañas igaming/i }),
    ).toBeVisible();
  });

  test('/para-creadores', async ({ page }) => {
    const response = await page.goto('/para-creadores');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/SocialPro/);

    // Visible <h1> rendered directly in ParaCreadoresPage.
    await expect(
      page.getByRole('heading', { level: 1, name: /monetiza tu audiencia/i }),
    ).toBeVisible();
  });

  test('/giveaways', async ({ page }) => {
    const response = await page.goto('/giveaways');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/SocialPro/);

    // The sticky header always renders regardless of DB data.
    // It contains the "Sorteos & Códigos" label text.
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main, header').first()).toBeVisible();
  });

  test('/sorteos', async ({ page }) => {
    const response = await page.goto('/sorteos');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/SocialPro/);

    // The sticky header always renders regardless of DB data.
    await expect(page.locator('header')).toBeVisible();

    // The hero section always renders an h1 "Sorteos" (visible, not sr-only).
    await expect(
      page.getByRole('heading', { level: 1, name: /sorteos/i }).first(),
    ).toBeVisible();
  });

  test('/robots.txt returns 200 with User-agent directive', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);

    const body = await response.text();
    // The actual robots.txt uses "User-Agent" (capital A).
    expect(body).toContain('User-Agent');
  });

  test('/sitemap.xml returns 200 with XML sitemap content', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);

    const body = await response.text();
    // Next.js can emit either a <urlset> (single sitemap) or <sitemapindex>.
    expect(body).toMatch(/<urlset|<sitemapindex/);
  });
});
