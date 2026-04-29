import type { Page } from '@playwright/test';

/**
 * Navigate to /admin or /admin/<subpath> and wait for DOM content to load.
 *
 * Uses `domcontentloaded` instead of `networkidle` — the dev server is too
 * slow for networkidle to be reliable in CI or local runs.
 */
export async function gotoAdmin(page: Page, subpath?: string): Promise<void> {
  const url = subpath ? `/admin/${subpath.replace(/^\//, '')}` : '/admin';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

/**
 * Navigate to /marcas or /marcas/<subpath> and wait for DOM content to load.
 *
 * Uses `domcontentloaded` instead of `networkidle` — the dev server is too
 * slow for networkidle to be reliable in CI or local runs.
 */
export async function gotoBrand(page: Page, subpath?: string): Promise<void> {
  const url = subpath ? `/marcas/${subpath.replace(/^\//, '')}` : '/marcas';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

/**
 * Navigate to `url`, query `selector` in the DOM, and return the trimmed
 * text content of the first matching element — or `null` if nothing matches
 * or the page errors.
 *
 * Useful for extracting slugs or identifiers from listing pages when no
 * dedicated JSON API is available.
 *
 * @example
 * ```ts
 * const slug = await getFirstTextMatch(page, '/admin/marcas', '[data-slug]');
 * ```
 */
export async function getFirstTextMatch(
  page: Page,
  url: string,
  selector: string,
): Promise<string | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const el = page.locator(selector).first();
    const count = await el.count();
    if (count === 0) return null;
    const text = await el.textContent();
    return text?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Assert that the current page has no horizontal overflow.
 *
 * Evaluates `document.body.scrollWidth <= document.documentElement.clientWidth`
 * in the browser context and throws if overflow is detected.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.body.scrollWidth > document.documentElement.clientWidth,
  );
  if (hasOverflow) {
    throw new Error(
      `Horizontal overflow detected: body.scrollWidth (${await page.evaluate(() => document.body.scrollWidth)}) > clientWidth (${await page.evaluate(() => document.documentElement.clientWidth)})`,
    );
  }
}

/**
 * Fill a login form using the standard email/password input fields.
 *
 * Locates inputs by `type` attribute so it works regardless of `name` or
 * `id` conventions across different auth pages.
 */
export async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
}

/**
 * Wait for the page to reach a stable loaded state.
 *
 * Uses `domcontentloaded` for speed — sufficient for most assertions.
 * Call after navigation when you need to ensure the DOM is ready before
 * interacting with elements.
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
}
