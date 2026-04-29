import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for public dynamic routes.
 *
 * Strategy: navigate to the listing page first, find the first matching link,
 * extract the href, then navigate to the detail page. If no links are found
 * (empty DB) the test is skipped — never fails.
 *
 * Assertions are structural only (h1, main, header) — never on copy or
 * class names — so they survive design tweaks and content changes.
 */
test.describe('Public dynamic routes', () => {
  // ── /blog/:slug ──────────────────────────────────────────────────────────

  test('/blog/:slug — post page renders h1 and is not 404', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });

    const firstLink = page.locator('a[href^="/blog/"]').first();
    if (await firstLink.count() === 0) {
      test.skip(true, 'No hay posts en la DB');
      return;
    }

    const href = await firstLink.getAttribute('href');
    const response = await page.goto(href!, { waitUntil: 'domcontentloaded' });

    expect(response?.status()).not.toBe(500);
    expect(await page.title()).not.toMatch(/404/i);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  // ── /casos/:slug ─────────────────────────────────────────────────────────

  test('/casos/:slug — case study page renders heading and is not 404', async ({ page }) => {
    await page.goto('/casos', { waitUntil: 'domcontentloaded' });

    const firstLink = page.locator('a[href^="/casos/"]').first();
    if (await firstLink.count() === 0) {
      test.skip(true, 'No hay casos en la DB');
      return;
    }

    const href = await firstLink.getAttribute('href');
    const response = await page.goto(href!, { waitUntil: 'domcontentloaded' });

    expect(response?.status()).not.toBe(500);
    expect(await page.title()).not.toMatch(/404/i);
    // The case study page renders an <h1> with the case title in the hero section.
    await expect(page.locator('h1').first()).toBeVisible();
  });

  // ── /talentos/:slug ───────────────────────────────────────────────────────

  test('/talentos/:slug — talent profile renders name heading and is not 404', async ({ page }) => {
    // TalentCard renders as <button> (not a link) — it opens a modal with a
    // "Ver perfil completo" link. We use `button:has(h3)` to target talent
    // cards specifically, skipping the filter buttons ("Todos", "Twitch", etc.)
    // that are also inside the #talentos section.
    await page.goto('/talentos', { waitUntil: 'networkidle' });

    // Talent card buttons contain an <h3> with the talent name.
    const firstCard = page.locator('#talentos button:has(h3)').first();
    if (await firstCard.count() === 0) {
      test.skip(true, 'No hay talentos en la DB');
      return;
    }

    await firstCard.scrollIntoViewIfNeeded();
    await firstCard.click();

    // The modal is animated via motion/react — wait for the dialog element.
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'attached', timeout: 10_000 });

    const profileLink = modal.locator('a[href^="/talentos/"]').first();
    await profileLink.waitFor({ state: 'attached', timeout: 5_000 });

    const href = await profileLink.getAttribute('href');
    const response = await page.goto(href!, { waitUntil: 'domcontentloaded' });

    expect(response?.status()).not.toBe(500);
    expect(await page.title()).not.toMatch(/404/i);
    // The talent page renders an <h1> with the talent's name in the hero section.
    await expect(page.locator('h1').first()).toBeVisible();
  });

  // ── /:creatorSlug (link-in-bio) ───────────────────────────────────────────

  test('/:creatorSlug — link-in-bio page loads without crashing', async ({ page }) => {
    // Derive the slug from the /talentos listing via the modal profile link.
    // The /:creatorSlug route calls notFound() when the talent has no codes or
    // giveaways, so a 404 is an acceptable outcome — we only assert no 500.
    await page.goto('/talentos', { waitUntil: 'networkidle' });

    const firstCard = page.locator('#talentos button:has(h3)').first();
    if (await firstCard.count() === 0) {
      test.skip(true, 'No hay talentos en la DB');
      return;
    }

    await firstCard.scrollIntoViewIfNeeded();
    await firstCard.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'attached', timeout: 10_000 });

    const profileLink = modal.locator('a[href^="/talentos/"]').first();
    await profileLink.waitFor({ state: 'attached', timeout: 5_000 });

    const talentHref = await profileLink.getAttribute('href');
    // Extract slug from "/talentos/<slug>" → navigate to "/<slug>"
    const slug = talentHref!.replace('/talentos/', '');
    const response = await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });

    // 404 is acceptable (talent has no codes/giveaways); 500 is not.
    expect(response?.status()).not.toBe(500);
  });

  // ── /blog/feed.xml ────────────────────────────────────────────────────────

  test('/blog/feed.xml — returns 200 with XML content-type', async ({ request }) => {
    const response = await request.get('/blog/feed.xml');

    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/xml/i);
  });

  // ── /c/:slug ──────────────────────────────────────────────────────────────

  test('/c/:slug — nonexistent slug does not crash with 500', async ({ page }) => {
    // The /c/[slug] route calls notFound() for unknown slugs, so we expect
    // a 404 page — never a 500. We use a slug that is guaranteed not to exist.
    const response = await page.goto('/c/nonexistent-slug-e2e-test', {
      waitUntil: 'domcontentloaded',
    });

    expect(response?.status()).not.toBe(500);
  });
});
