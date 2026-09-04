import { expect, test } from '@playwright/test';

const VIEWPORTS = [375, 390, 768, 1024, 1440, 1920] as const;

for (const width of VIEWPORTS) {
  test.describe(`KekoPilot responsive — ${width}px`, () => {
    test.use({ viewport: { width, height: width <= 390 ? 844 : 900 } });

    test('keeps the landing page usable without horizontal overflow', async ({ page }) => {
      await page.goto('/kekopilot');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('[data-kp-root]'))
        .toHaveAttribute('data-kp-version', 'web-v6');

      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasOverflow).toBe(false);

      if (width <= 1100) {
        await expect(page.getByLabel('Abrir navegación')).toBeVisible();
      } else {
        await expect(page.getByRole('navigation', { name: /principal/i })).toBeVisible();
      }
    });
  });
}

test('supports agent selection and keyboard navigation', async ({ page }) => {
  await page.goto('/kekopilot#agentes');

  const dealClerk = page.getByRole('tab', { name: /Zack Deal Clerk/ });
  await dealClerk.click();
  await dealClerk.press('ArrowRight');

  await expect(page.getByRole('tab', { name: /Zack Growth/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel').getByRole('heading', { name: 'Zack Growth' })).toBeVisible();
});

test('explains human control and uses the on-brand commercial close', async ({ page }) => {
  await page.goto('/kekopilot');

  await expect(page.getByRole('heading', { name: 'Automatiza el proceso. Conserva la decisión.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Agendar una demo/ }).first()).toBeVisible();
  await expect(page.locator('[data-kp-closing]')).not.toHaveCSS('background-color', 'rgb(92, 27, 27)');
});

test('shows the three product views and supports keyboard navigation', async ({ page }) => {
  await page.goto('/kekopilot#producto');

  const decisionQueue = page.getByRole('tab', { name: /Cola de decisiones/ });
  await decisionQueue.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Pipeline/ })).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Ficha de deal/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: /Ficha de deal/ })).toContainText('Emitir factura 2/3');
});

test.describe('KekoPilot reduced motion', () => {
  test('shows the full narrative without scroll-driven transforms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/kekopilot');

    await expect(page.locator('[data-kp-root]')).toHaveAttribute('data-kp-motion', 'reduced');
    await expect(page.locator('[data-kp-arch-row]:not([data-active])')).toHaveCount(0);
    await expect(page.locator('[data-kp-flow-track]')).not.toHaveCSS('transform', /matrix/);
  });
});

test('switches to the English experience', async ({ page }) => {
  await page.goto('/kekopilot');
  await page.getByRole('link', { name: 'EN', exact: true }).click();

  await expect(page).toHaveURL(/\/en\/kekopilot$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your operations');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
