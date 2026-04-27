import { test, expect } from '@playwright/test';

/**
 * End-to-end proof that the landing page survives the worst case for
 * the motion-driven reveal pattern: the motion JavaScript chunk never
 * loads at all (CSP block, ad-blocker, network drop, in-app webview
 * stripping out scripts, etc.).
 *
 * Setup: a browser context with JavaScript disabled. React does not
 * hydrate, `useVisibilityFailSafe` never runs, and `IntersectionObserver`
 * is never registered. The only thing keeping the page visible is the
 * CSS safety net in globals.css (`[data-motion-fallback]` keyframe).
 *
 * What we assert:
 *   1. The CSS rule and keyframe are actually present on the served page.
 *   2. SSR HTML still includes the elements that previously stayed at
 *      `opacity: 0` (SectionTags, MetricsSection tiles, CTA wrapper).
 *   3. After the 3s + animation window, computed `opacity` of those
 *      elements is `1` — i.e. the user sees them.
 *
 * NOTE: a JS-disabled context is the strictest possible reproduction.
 * Real broken sessions usually have JS but a missing motion chunk; that
 * case is strictly easier (the JS fail-safe in `useVisibilityFailSafe`
 * also kicks in), so passing this test implies that case passes too.
 */
test.describe('Landing motion fail-safe (JS disabled)', () => {
  test.use({ javaScriptEnabled: false });

  test('SectionTag remains visible without JavaScript', async ({ page }) => {
    await page.goto('/');

    const tag = page.locator('[data-motion-fallback]').first();
    await expect(tag).toBeAttached();

    // CSS keyframe runs after a 3s delay — wait it out and a small buffer.
    await page.waitForTimeout(3500);

    const opacity = await tag.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.9);
  });

  test('every data-motion-fallback wrapper ends up visible', async ({ page }) => {
    await page.goto('/');

    const count = await page.locator('[data-motion-fallback]').count();
    expect(count).toBeGreaterThan(0);

    await page.waitForTimeout(3500);

    const opacities = await page
      .locator('[data-motion-fallback]')
      .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).opacity));

    for (const o of opacities) {
      expect(Number(o)).toBeGreaterThan(0.9);
    }
  });

  test('CSS safety net is actually shipped to the client', async ({ page }) => {
    await page.goto('/');

    const cssText = await page.evaluate(() => {
      const out: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            out.push(rule.cssText);
          }
        } catch {
          // Cross-origin sheet — skip.
        }
      }
      return out.join('\n');
    });

    expect(cssText).toMatch(/\[data-motion-fallback\]/);
    expect(cssText).toMatch(/motion-fallback-reveal/);
  });
});
