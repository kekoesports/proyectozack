import { test, expect } from '@playwright/test';

import { gotoAdmin } from './helpers';

test.describe('Admin detail pages', () => {
  test('/admin/campanas/:id renders', async ({ page }) => {
    // The campaigns listing uses an onClick drawer (no <a href> links to detail
    // pages). Use the admin search API to discover a campaign href instead.
    const response = await page.request.get('/api/admin/search?q=&limit=1');
    let campaignHref: string | null = null;

    if (response.ok()) {
      const json = await response.json() as {
        groups: { campaigns: Array<{ href: string }> };
      };
      const hits = json.groups?.campaigns ?? [];
      if (hits.length > 0 && hits[0]?.href) {
        campaignHref = hits[0].href;
      }
    }

    // Fallback: navigate to the listing and look for any anchor matching the pattern
    if (!campaignHref) {
      await gotoAdmin(page, 'campanas');
      const link = page.locator('a[href^="/admin/campanas/"]').first();
      if (await link.count() > 0) {
        campaignHref = await link.getAttribute('href');
      }
    }

    if (!campaignHref) {
      test.skip(true, 'No hay campañas en la DB');
      return;
    }

    await page.goto(campaignHref, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('/admin/talents/:id renders', async ({ page }) => {
    // The table tab renders <Link href="/admin/talents/:id/negocio"> — extract
    // the ID from those links and navigate to the profile route.
    await gotoAdmin(page, 'talents');

    // Switch to the "Tabla" tab which contains explicit href links
    const tablaTab = page.getByRole('button', { name: 'Tabla' });
    if (await tablaTab.count() > 0) {
      await tablaTab.click();
      await page.waitForTimeout(300);
    }

    const negocioLink = page.locator('a[href^="/admin/talents/"][href$="/negocio"]').first();

    if (await negocioLink.count() === 0) {
      test.skip(true, 'No hay talents en la DB');
      return;
    }

    const negocioHref = await negocioLink.getAttribute('href');
    // Strip the trailing /negocio to get the profile URL
    const profileHref = negocioHref!.replace(/\/negocio$/, '');

    await page.goto(profileHref, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('/admin/talents/:id/negocio renders', async ({ page }) => {
    // Same strategy: switch to table tab, find a negocio link, navigate directly.
    await gotoAdmin(page, 'talents');

    const tablaTab = page.getByRole('button', { name: 'Tabla' });
    if (await tablaTab.count() > 0) {
      await tablaTab.click();
      await page.waitForTimeout(300);
    }

    const negocioLink = page.locator('a[href^="/admin/talents/"][href$="/negocio"]').first();

    if (await negocioLink.count() === 0) {
      test.skip(true, 'No hay talents en la DB');
      return;
    }

    const negocioHref = await negocioLink.getAttribute('href');

    await page.goto(negocioHref!, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('/admin/analytics/report/:talentSlug renders', async ({ page }) => {
    // The cards view shows "@{slug}" as a paragraph inside each talent card.
    // Extract the slug from the first visible card.
    await gotoAdmin(page, 'talents');

    // Cards tab is the default — look for "@slug" paragraphs inside card buttons
    const slugEl = page
      .locator('[role="button"] p')
      .filter({ hasText: /^@/ })
      .first();

    let talentSlug: string | null = null;

    if (await slugEl.count() > 0) {
      const text = await slugEl.textContent();
      // text is "@some-slug" — strip the leading @
      talentSlug = text?.trim().replace(/^@/, '') ?? null;
    }

    if (!talentSlug) {
      test.skip(true, 'No hay talents en la DB o no se pudo extraer el slug');
      return;
    }

    await page.goto(`/admin/analytics/report/${talentSlug}`, { waitUntil: 'domcontentloaded' });

    // GrowthReport renders the talent name in a div (not h1) and platform
    // sections in h2 elements. Assert the first h2 heading is visible.
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
  });
});
